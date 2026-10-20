import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { drawChar } from './draw'
import { enterPin, seed, setupPin } from './helpers'

const chars = JSON.parse(readFileSync('src/data/generated/chars.json', 'utf8')) as Record<string, { py: string[]; semantic?: string }>
const textbook = JSON.parse(readFileSync('src/data/generated/textbook.json', 'utf8')) as {
  books: { lessons: { id: string; shizi: { char: string }[]; xiezi: string[] }[] }[]
}
const { radicals } = JSON.parse(readFileSync('src/data/generated/extension.json', 'utf8')) as {
  radicals: Record<string, { meaning: string }>
}
const lessons = textbook.books.flatMap((b) => b.lessons)
const textbookChars = new Set(lessons.flatMap((l) => l.shizi.map((r) => r.char)))
const allXiezi = new Set(lessons.flatMap((l) => l.xiezi))

/** 一次已完成评估的报告（只含每日任务用到的字段） */
function assessment(report: { recognition: number; dictation?: number; backlog: string[]; level: string }) {
  return {
    kind: 'run',
    date: '2026-10-18',
    data: {
      sampleSize: 40,
      progressLessonId: 'g1a-s3',
      parts: {},
      report: {
        date: '2026-10-18',
        progressLessonId: 'g1a-s3',
        recognition: { tested: 20, correct: Math.round(report.recognition * 20), accuracy: report.recognition, estimate: 0, learned: 0, perBook: [] },
        ...(report.dictation !== undefined ? { dictation: { tested: 10, correct: 9, accuracy: report.dictation } } : {}),
        backlog: report.backlog,
        focus: '并行',
        route: '同步',
        level: report.level,
      },
    },
  }
}

async function setProgress(page: Page, lesson: string) {
  await page.getByRole('link', { name: '打开课本与字库' }).tap()
  await page.getByRole('button', { name: `把“${lesson}”设为当前进度` }).tap()
  await page.getByRole('link', { name: '返回家长模式' }).tap()
}

async function openParent(page: Page) {
  await page.getByRole('link', { name: '家长' }).tap()
  await enterPin(page, '2468')
  await expect(page.getByRole('heading', { name: '家长模式' })).toBeVisible()
}

/** 走完侦察任务或新字任务：形声字按线索选对，其他字先猜再看答案；要描红的字描一遍。返回学过的字。 */
async function learnAll(page: Page): Promise<{ char: string; traced: boolean }[]> {
  await page.getByRole('button', { name: '开始' }).tap()
  const total = Number((await page.locator('.game-progress').textContent())!.match(/\/ (\d+)/)![1])
  const learned: { char: string; traced: boolean }[] = []
  for (let i = 1; i <= total; i++) {
    await expect(page.locator('.game-progress')).toHaveText(`第 ${i} / ${total} 个字`)
    const char = (await page.getByTestId('kai-char').getAttribute('aria-label'))!
    if (await page.locator('.clues').count()) {
      await page.locator('.option').filter({ hasText: new RegExp(`^${chars[char].py[0]}$`) }).tap()
      await page.locator('.question').nth(1).locator('.option').filter({ hasText: radicals[chars[char].semantic!].meaning }).tap()
    } else {
      await page.getByRole('button', { name: '看答案', exact: true }).tap()
    }
    await expect(page.getByTestId('learn-reading')).toHaveText(chars[char].py[0])
    const next = page.locator('.reveal .btn-primary')
    const traced = (await next.textContent())!.includes('描一描')
    await next.tap()
    if (traced) await drawChar(page, char)
    learned.push({ char, traced })
  }
  return learned
}

test('加强 + 补漏: two segments with a rest in between, then streak, XP and backlog characters in the Boss', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.install({ time: new Date('2026-10-19T10:00:00') })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '今日任务' })).toBeVisible()
  // 评估发现“天”“人”没掌握，建议“加强”
  await seed(page, 'assessments', [assessment({ recognition: 0.6, backlog: ['天', '人'], level: '加强' })])
  await page.reload()

  await setupPin(page)
  await setProgress(page, '口耳目手足')
  await page.getByRole('link', { name: '打开练习级别与路线' }).tap()
  await expect(page.getByTestId('level-suggestion')).toContainText('评估建议：加强')
  await page.getByRole('button', { name: '加强（特训营）' }).tap()
  // 级别内微调：每天新字 8 → 2
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: '减少每天新字' }).tap()
  await expect(page.getByTestId('tweak-每天新字')).toHaveText('2')
  await expect(page.getByTestId('current-route')).toHaveText('当前路线：补漏（自动）')
  await page.getByRole('link', { name: '返回家长模式' }).tap()
  await page.getByRole('button', { name: '返回孩子模式' }).tap()

  // 第一段：侦察 + 新字；第二段：复习（还没有到期的 Boss）
  await expect(page.getByTestId('today-level')).toContainText('特训营')
  await expect(page.getByRole('heading', { name: '第一段' })).toBeVisible()
  await expect(page.getByTestId('task-newChars')).toContainText('把以前没记住的字补回来：2 个')
  await expect(page.getByTestId('task-review')).toHaveAttribute('data-state', 'locked')

  await page.getByTestId('task-preview').getByRole('link').tap()
  await learnAll(page)
  await expect(page.getByRole('status').filter({ hasText: '侦察完成！' })).toBeVisible()
  await page.getByRole('link', { name: '回到今日任务' }).tap()
  await expect(page.getByTestId('task-preview')).toHaveAttribute('data-state', 'done')

  await page.getByTestId('task-newChars').getByRole('link').tap()
  const learned = await learnAll(page)
  expect(learned.map((l) => l.char).sort()).toEqual(['人', '天'])
  // 需要会写的字（写字表中的字）描了红
  for (const l of learned) expect(l.traced).toBe(allXiezi.has(l.char))

  // 第一段完成 → 休息 5 分钟，时间到了才能开始第二段
  const rest = page.getByRole('dialog', { name: /第一段结束啦/ })
  await expect(rest).toBeVisible()
  await expect(rest.getByRole('button', { name: '还在休息', exact: true })).toBeDisabled()
  await page.clock.runFor(5 * 60_000 + 1_000)
  await rest.getByRole('button', { name: '开始第二段', exact: true }).tap()
  await expect(rest).toBeHidden()
  await page.getByRole('link', { name: '回到今日任务' }).tap()
  await expect(page.getByTestId('xp-total')).toContainText('经验值 10')

  // 第二段：当天复习本课生字（按钮闯关，每个字停 1.2 秒再点）
  await page.getByTestId('task-review').getByRole('link').tap()
  await expect(page.getByTestId('flash-task')).toContainText('复习本课的 7 个字')
  await page.getByRole('button', { name: '用按钮闯关' }).tap()
  // 暂停模拟时钟、手动拨动时间，结果与机器快慢无关
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 500)
  for (let i = 0; i < 7; i++) {
    await page.clock.runFor(1_200)
    await page.getByRole('button', { name: '认识' }).tap()
  }
  await page.clock.resume()
  await page.getByRole('button', { name: '完成，看成绩' }).tap()
  await page.getByRole('link', { name: '回到今日任务' }).tap()

  await expect(page.getByRole('status').filter({ hasText: '今天的任务完成啦！经验值 +20' })).toBeVisible()
  await expect(page.getByTestId('streak')).toContainText('连续 1 天')
  await expect(page.getByTestId('xp-total')).toContainText('经验值 20')

  // 补漏字第二天出现在错字 Boss 中
  await page.clock.setSystemTime(new Date('2026-10-20T10:00:00'))
  await page.goto('/#/boss')
  await page.reload()
  await expect(page.getByTestId('boss-remaining')).toHaveText('还剩 2 个')
  await expect(page.getByTestId('kai-char')).toHaveAttribute('aria-label', /^(天|人)$/)
  // 昨天完成了，连续天数保持
  await page.getByRole('link', { name: '回首页' }).tap()
  await expect(page.getByTestId('streak')).toContainText('连续 1 天')
})

test('标准 + 拓展: new-character task brings extension characters, reading only by default', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '今日任务' })).toBeVisible()
  // 首次评估认读 95%、书写 90%，没有待攻克字 → 拓展
  await seed(page, 'assessments', [assessment({ recognition: 0.95, dictation: 0.9, backlog: [], level: '标准' })])
  await page.reload()
  await setupPin(page)
  await setProgress(page, '口耳目手足')
  await page.getByRole('link', { name: '打开练习级别与路线' }).tap()
  await expect(page.getByTestId('current-route')).toHaveText('当前路线：拓展（自动）')
  await page.getByRole('link', { name: '返回家长模式' }).tap()
  await page.getByRole('button', { name: '返回孩子模式' }).tap()

  await expect(page.getByTestId('today-level')).toContainText('侦探训练')
  await expect(page.getByTestId('task-newChars')).toContainText('学课外的新字：3 个')
  await page.getByTestId('task-newChars').getByRole('link').tap()
  const learned = await learnAll(page)
  expect(learned).toHaveLength(3)
  for (const l of learned) {
    expect(textbookChars.has(l.char)).toBe(false)
    expect(l.traced).toBe(false)
  }
  await expect(page.getByRole('status').filter({ hasText: '新字学会啦！' })).toBeVisible()
})

test('parent level and route changes update the tasks; rewards are requested by the child and confirmed by the parent', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/')
  await expect(page.getByTestId('rank-name')).toContainText('汉字学徒 1 级')
  await seed(page, 'xpEvents', [{ id: 'seed:1', kind: 'dailySegment', amount: 30, ts: 1 }])
  await seed(page, 'settings', [{ key: 'lastSeenRank', value: 0 }])
  await page.reload()
  // 升级的庆祝
  const levelUp = page.getByRole('dialog', { name: '升级啦！' })
  await expect(levelUp).toContainText('你现在是 汉字学徒 2 级')
  await levelUp.getByRole('button', { name: '太棒了' }).tap()
  await expect(levelUp).toBeHidden()

  await setupPin(page)
  await setProgress(page, '口耳目手足')
  await page.getByRole('link', { name: '打开练习级别与路线' }).tap()
  await expect(page.getByTestId('level-suggestion')).toContainText('还没有评估')
  await expect(page.getByTestId('current-route')).toHaveText('当前路线：同步（自动）')
  await page.getByRole('link', { name: '返回家长模式' }).tap()
  await page.getByRole('button', { name: '返回孩子模式' }).tap()
  await expect(page.getByTestId('today-level')).toContainText('侦探训练')
  await expect(page.getByTestId('task-newChars')).toContainText('学本课和下一课的新字：3 个')

  // 家长切到“轻松”：没有新字任务
  await openParent(page)
  await page.getByRole('link', { name: '打开练习级别与路线' }).tap()
  await page.getByRole('button', { name: '轻松（日常巡逻）' }).tap()
  await page.getByRole('link', { name: '返回家长模式' }).tap()
  await page.getByRole('button', { name: '返回孩子模式' }).tap()
  await expect(page.getByTestId('today-level')).toContainText('日常巡逻')
  await expect(page.getByTestId('task-newChars')).toHaveCount(0)

  // 家长切到“加强”并锁定拓展：两段，新字是课外字
  await openParent(page)
  await page.getByRole('link', { name: '打开练习级别与路线' }).tap()
  await page.getByRole('button', { name: '加强（特训营）' }).tap()
  await page.getByRole('button', { name: '锁定拓展' }).tap()
  await expect(page.getByTestId('current-route')).toHaveText('当前路线：拓展（家长锁定）')
  await page.getByRole('link', { name: '返回家长模式' }).tap()
  await page.getByRole('button', { name: '返回孩子模式' }).tap()
  await expect(page.getByTestId('today-level')).toContainText('特训营')
  await expect(page.getByTestId('task-newChars')).toContainText('学课外的新字：8 个')
  await expect(page.getByRole('heading', { name: '第二段' })).toBeVisible()

  // 家长添加奖励
  await openParent(page)
  await page.getByRole('link', { name: '打开奖励清单' }).tap()
  await page.getByLabel('奖励名称').fill('周末去公园')
  await page.getByLabel('需要经验值').fill('20')
  await page.getByRole('button', { name: '添加奖励' }).tap()
  await expect(page.getByRole('list', { name: '奖励' })).toContainText('周末去公园 · 20 经验值')
  await page.getByRole('link', { name: '返回家长模式' }).tap()
  await page.getByRole('button', { name: '返回孩子模式' }).tap()

  // 孩子申请兑换
  await page.getByTestId('xp-available').tap()
  await expect(page.getByTestId('shop-available')).toContainText('30')
  await page.getByRole('button', { name: '申请兑换“周末去公园”' }).tap()
  await expect(page.getByRole('status').filter({ hasText: '已经申请，等家长确认。' })).toBeVisible()
  await expect(page.getByTestId('shop-available')).toContainText('10')
  await expect(page.getByTestId('my-redemption')).toContainText('等家长确认')
  await page.getByRole('link', { name: '回首页' }).tap()

  // 家长确认：可用经验值减少，累计经验值和等级不变
  await openParent(page)
  await page.getByRole('link', { name: '打开奖励清单' }).tap()
  await page.getByRole('button', { name: '确认兑换' }).tap()
  await expect(page.getByTestId('parent-xp')).toHaveText('累计 30（决定等级，不会减少）· 可兑换 10')
  await expect(page.getByText('已兑换')).toBeVisible()
  await page.getByRole('link', { name: '返回家长模式' }).tap()
  await page.getByRole('button', { name: '返回孩子模式' }).tap()
  await expect(page.getByTestId('rank-name')).toContainText('汉字学徒 2 级')
  await expect(page.getByTestId('xp-available')).toContainText('可兑换 10')
})

test('weekly Boss opens on Saturday with this week’s characters and compares with last week', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-24T10:00:00') })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '今日任务' })).toBeVisible()
  // 本周练过 3 个只要求会认的字；上周周 Boss 50%
  const week = [...textbookChars].filter((c) => !allXiezi.has(c)).slice(0, 3)
  await seed(
    page,
    'attempts',
    week.map((char, i) => ({ char, activity: 'flash', result: 'correct', date: '2026-10-20', ts: i + 1 })),
  )
  await seed(page, 'attempts', [{ char: '天', activity: 'flash', result: 'correct', date: '2026-10-18', ts: 9 }])
  await seed(page, 'exams', [
    { kind: 'weekly', key: '2026-10-12', title: '周 Boss 战', date: '2026-10-17', chars: ['地'], write: [], status: 'done', results: { 地: false }, accuracy: 0.5, doneOn: '2026-10-17' },
  ])
  await page.reload()

  await page.getByRole('link', { name: /周 Boss 战/ }).tap()
  await expect(page.getByTestId('exam-progress')).toHaveText('第 1 / 3 个')
  for (let i = 0; i < 3; i++) {
    expect(week).toContain(await page.getByTestId('kai-char').getAttribute('aria-label'))
    await page.getByRole('button', { name: '我会读' }).tap()
    await page.getByRole('button', { name: '读对了' }).tap()
  }
  await expect(page.getByTestId('exam-accuracy')).toHaveText('100%')
  await expect(page.getByTestId('exam-compare')).toContainText('上周 50%，这周进步了 50%！')
  await page.getByRole('link', { name: '回到今日任务' }).tap()
  await expect(page.getByRole('link', { name: /周 Boss 战/ })).toHaveCount(0)
})
