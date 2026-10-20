import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { enterPin, seed, setupPin } from './helpers'

const textbook = JSON.parse(readFileSync('src/data/generated/textbook.json', 'utf8')) as {
  books: { lessons: { id: string; shizi: { char: string }[]; xiezi: string[] }[] }[]
}
const lessons = textbook.books.flatMap((b) => b.lessons)
const PROGRESS = 'g1a-s3'
const learned = lessons.slice(0, lessons.findIndex((l) => l.id === PROGRESS) + 1)
const shiziCount = new Set(learned.flatMap((l) => l.shizi.map((r) => r.char))).size
const xieziCount = new Set(learned.flatMap((l) => l.xiezi)).size

function plan(date: string) {
  return { date, key: 'seed', level: '标准', route: '同步', tasks: [], done: {}, segment: 1, complete: true, createdAt: 0 }
}

function weekly(key: string, doneOn: string, read: boolean[], write: boolean[]) {
  const chars = ['天', '地', '人', '你', '我']
  return {
    kind: 'weekly',
    key,
    title: '周 Boss 战',
    date: doneOn,
    chars,
    write: chars.slice(0, write.length),
    status: 'done',
    results: {},
    readResults: Object.fromEntries(read.map((r, i) => [chars[i], r])),
    writeResults: Object.fromEntries(write.map((r, i) => [chars[i], r])),
    progressLessonId: PROGRESS,
    accuracy: 0.6,
    doneOn,
  }
}

test('the dashboard shows the seeded records: literacy curve, route, writing, Boss, check-ins, usage and reassessment', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-20T10:00:00') })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '今日任务' })).toBeVisible()
  await seed(page, 'settings', [
    { key: 'progressLessonId', value: PROGRESS },
    { key: 'practiceLevel', value: '标准' },
    { key: 'levelSince', value: '2026-10-01' },
  ])
  await seed(page, 'assessments', [
    {
      kind: 'run',
      date: '2026-10-01',
      data: {
        sampleSize: 40,
        progressLessonId: PROGRESS,
        parts: {},
        report: {
          date: '2026-10-01',
          progressLessonId: PROGRESS,
          recognition: { tested: 20, correct: 18, accuracy: 0.9, estimate: 30, learned: shiziCount, perBook: [] },
          dictation: { tested: 10, correct: 5, accuracy: 0.5 },
          extension: { estimate: 200, layersTested: 2 },
          backlog: [],
          focus: '并行',
          route: '同步',
          level: '标准',
        },
      },
    },
  ])
  await seed(page, 'exams', [
    weekly('2026-10-05', '2026-10-10', [true, true, false, false, true], [true]),
    weekly('2026-10-12', '2026-10-17', [true, true, true, true, false], [true, false]),
  ])
  await seed(page, 'bossCards', [
    { char: '人', stage: 1, due: '2026-10-22', streak: 0, status: 'active', sources: ['flash'], updatedAt: 0 },
    { char: '天', stage: 1, due: '2026-10-21', streak: 0, status: 'active', sources: ['flash'], updatedAt: 0 },
    { char: '地', stage: 2, due: '2026-10-23', streak: 1, status: 'active', sources: ['flash'], updatedAt: 0 },
    { char: '山', stage: 5, due: '2026-11-01', streak: 3, status: 'defeated', sources: ['flash'], updatedAt: 0 },
  ])
  await seed(page, 'dailyPlans', [plan('2026-10-10'), plan('2026-10-17'), plan('2026-10-18'), plan('2026-10-19')])
  await seed(page, 'usage', [
    { date: '2026-10-19', seconds: 1200 },
    { date: '2026-10-15', seconds: 600 },
    { date: '2026-10-01', seconds: 3000 },
  ])
  await seed(page, 'writings', [
    {
      date: '2026-10-12',
      data: {
        status: 'scored',
        step: 'upgrade',
        level: 1,
        goal: 1,
        imageIds: [],
        clues: {},
        story: [],
        report: { text: '' },
        upgrade: { sentence: '', rewrite: '' },
        score: { scores: { elements: 3, order: 2, sentences: 3, details: 2, handwriting: 2 }, total: 12, result: 'level', date: '2026-10-12' },
      },
    },
  ])
  await page.reload()
  await setupPin(page)

  // 识字量：最近一次是 10-17 的周 Boss：认读 4/5，默写 1/2；课外沿用评估估算
  const legend = page.getByTestId('literacy-latest')
  await expect(legend).toContainText(`课内认读 ${Math.round(0.8 * shiziCount)}`)
  await expect(legend).toContainText(`课内会写 ${Math.round(0.5 * xieziCount)}`)
  await expect(legend).toContainText('课外识字 200')
  await expect(page.getByRole('img', { name: /识字量曲线/ })).toBeVisible()

  await expect(page.getByTestId('dash-route')).toContainText('级别：标准')
  await expect(page.getByTestId('dash-backlog')).toContainText('补漏：已攻克')
  await expect(page.getByTestId('dash-extension')).toContainText('课外新学 0 字')
  await expect(page.getByTestId('dash-writing')).toContainText('写作等级 1 级')
  await expect(page.getByTestId('dash-writing-score')).toContainText('10-12 · 1 级 · 12 / 15 分 · 达到等级目标')
  await expect(page.getByTestId('dash-boss')).toContainText('击败率 25%（已打败 1 / 共 4 个）')
  await expect(page.getByTestId('dash-boss-chars')).toHaveText('天 人 地')
  await expect(page.getByTestId('dash-checkin')).toContainText('连续打卡 3 天 · 累计完成 4 天')
  await expect(page.getByTestId('dash-usage')).toContainText('近 7 天共用 30 分钟')
  await expect(page.getByTestId('usage-bar')).toHaveCount(7)
  await expect(page.getByTestId('dash-reassess')).toContainText('距离下次复评（每 4 周）还有 9 天')

  // 周 Boss 连续 2 周低于 70%：建议升级，可以采纳或忽略
  const advice = page.getByTestId('dash-advice')
  await expect(advice).toContainText('建议升到“加强”')
  await advice.getByRole('button', { name: '采纳：改为加强' }).tap()
  await expect(page.getByTestId('dash-route')).toContainText('级别：加强')
  await expect(advice).toContainText('也检查一下每天的新字是否太多')
  await advice.getByRole('button', { name: '忽略' }).tap()
  await expect(page.getByTestId('dash-advice')).toHaveCount(0)

  // 所有设置入口都在看板下面
  for (const name of ['打开课本与字库', '打开现状评估', '打开练习级别与路线', '打开奖励清单', '打开看图写作评分', '打开推荐书单'])
    await expect(page.getByRole('link', { name })).toBeVisible()
  for (const name of ['修改 PIN', '导出备份', '从备份恢复']) await expect(page.getByRole('button', { name })).toBeVisible()
})

test('the parent changes the PIN', async ({ page }) => {
  await page.goto('/')
  await setupPin(page)
  await page.getByRole('button', { name: '修改 PIN' }).tap()
  await enterPin(page, '1357')
  await enterPin(page, '1358')
  await expect(page.getByText('两次输入不一致')).toBeVisible()
  await enterPin(page, '1357')
  await enterPin(page, '1357')
  await expect(page.getByText('PIN 已修改。')).toBeVisible()

  await page.getByRole('button', { name: '返回孩子模式' }).tap()
  await page.getByRole('link', { name: '家长' }).tap()
  await enterPin(page, '2468')
  await expect(page.getByText('PIN 不正确')).toBeVisible()
  await enterPin(page, '1357')
  await expect(page.getByRole('heading', { name: '家长模式' })).toBeVisible()
})
