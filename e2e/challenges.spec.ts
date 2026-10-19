import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { setupPin } from './helpers'

const chars = JSON.parse(readFileSync('src/data/generated/chars.json', 'utf8')) as Record<string, { py: string[]; semantic?: string }>
const textbook = JSON.parse(readFileSync('src/data/generated/textbook.json', 'utf8')) as {
  books: { lessons: { id: string; shizi: { char: string }[] }[] }[]
}
/** 学到某一课（含）为止的生字 */
function learnedUpTo(lessonId: string): Set<string> {
  const lessons = textbook.books.flatMap((b) => b.lessons)
  const end = lessons.findIndex((l) => l.id === lessonId)
  return new Set(lessons.slice(0, end + 1).flatMap((l) => l.shizi.map((r) => r.char)))
}

const { radicals } = JSON.parse(readFileSync('src/data/generated/extension.json', 'utf8')) as {
  radicals: Record<string, { meaning: string }>
}

async function setProgress(page: Page, book: string, lesson: string) {
  await page.goto('/')
  await setupPin(page)
  await page.getByRole('link', { name: '打开课本与字库' }).tap()
  await page.getByRole('tab', { name: book }).tap()
  await page.getByRole('button', { name: `把“${lesson}”设为当前进度` }).tap()
  await page.getByRole('link', { name: '返回家长模式' }).tap()
  await page.getByRole('button', { name: '返回孩子模式' }).tap()
}

test('radical detective: solving every case levels up and records the round', async ({ page }) => {
  // 每一步有 1.5 秒思考时间，一关 12 步
  test.setTimeout(60_000)
  await setProgress(page, '二年级上册', '寒号鸟')
  await page.getByRole('link', { name: /部首侦探/ }).tap()
  await expect(page.getByText('难度 1：当前课')).toBeVisible()
  await page.getByRole('button', { name: '开始破案' }).tap()

  for (let i = 0; i < 6; i++) {
    await expect(page.getByText(`案子 ${i + 1} / 6`)).toBeVisible()
    const char = (await page.getByTestId('kai-char').getAttribute('aria-label'))!
    const info = chars[char]
    await page.getByRole('button', { name: info.py[0], exact: true }).tap()
    await page.getByRole('button', { name: radicals[info.semantic!].meaning, exact: true }).tap()
    await expect(page.getByRole('status').filter({ hasText: '推理正确！' })).toBeVisible()
    await page.getByRole('button', { name: i < 5 ? '下一个案子' : '结案' }).tap()
  }
  await expect(page.getByTestId('round-score')).toHaveText('6 / 6 个案子')
  await expect(page.getByTestId('level-change')).toHaveAttribute('data-text', '升级啦！下一关难度 2：本册')
  await page.getByRole('button', { name: '再来一关' }).tap()
  await expect(page.getByText('难度 2', { exact: false }).first()).toBeVisible()
})

test('radical detective: a wrong reading reveals the answer and the explanation', async ({ page }) => {
  await setProgress(page, '二年级上册', '寒号鸟')
  await page.getByRole('link', { name: /部首侦探/ }).tap()
  await page.getByRole('button', { name: '开始破案' }).tap()
  // F003：题目带拼音，例如“它可能读什么”的“读”注 dú
  await expect(page.locator('.question h2 rt').filter({ hasText: 'dú' })).toBeVisible()
  const char = (await page.getByTestId('kai-char').getAttribute('aria-label'))!
  const info = chars[char]
  const wrong = page.locator('.option').filter({ hasNotText: info.py[0] }).first()
  await wrong.tap()
  await expect(wrong).toHaveAttribute('data-state', 'wrong')
  await expect(page.locator('.option[data-state="answer"]')).toHaveText(info.py[0])
  await page.locator('.question').nth(1).locator('.option').first().tap()
  await expect(page.getByRole('status').filter({ hasText: '真相是：' })).toBeVisible()
  await expect(page.locator('.reveal-text strong').last()).toHaveText(info.py[0])
})

test('character family: placing radicals builds a family map', async ({ page }) => {
  await setProgress(page, '二年级上册', '寒号鸟')
  await page.getByRole('link', { name: /字族网络/ }).tap()
  await page.getByRole('button', { name: '开始' }).tap()
  const progress = page.locator('.game-progress')
  const total = Number((await progress.textContent())!.match(/\/ (\d+)/)![1])

  // 依次试每张偏旁卡：能组成字的会填进去，不能的会抖一下
  const cards = page.locator('.radical-card')
  const count = await cards.count()
  for (let i = 0; i < count && !(await page.getByText('字族导图完成').isVisible()); i++) {
    const card = cards.nth(i)
    if (await card.isEnabled()) await card.tap()
    await page.waitForTimeout(80)
  }
  await expect(page.getByRole('status').filter({ hasText: '字族导图完成' })).toBeVisible()
  await expect(page.getByTestId('round-score')).toHaveText(`${total} 个字`)
  await expect(page.getByLabel(/字族导图/)).toBeVisible()
  // F004：不再有“我的收藏”入口
  await expect(page.getByRole('button', { name: /我的收藏/ })).toHaveCount(0)
})

test('character family: a card can be dragged onto the center', async ({ page }) => {
  await setProgress(page, '二年级上册', '寒号鸟')
  await page.getByRole('link', { name: /字族网络/ }).tap()
  await page.getByRole('button', { name: '开始' }).tap()
  const center = (await page.getByTestId('family-center').boundingBox())!
  const cards = page.locator('.radical-card')
  for (let i = 0; i < (await cards.count()); i++) {
    const box = (await cards.nth(i).boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(center.x + center.width / 2, center.y + center.height / 2, { steps: 10 })
    await page.mouse.up()
    if ((await page.getByTestId('found-char').count()) > 0) break
  }
  await expect(page.getByTestId('found-char')).toHaveCount(1)
})

test('flash recall: timed round, rush reminder, honest review, personal best and boss', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T10:00:00') })
  await setProgress(page, '二年级上册', '寒号鸟')
  await page.getByRole('link', { name: /生字闪认/ }).tap()
  await expect(page.getByTestId('flash-info')).toContainText('90 秒')
  await page.getByRole('button', { name: '开始' }).tap()

  // 连续 4 个字一能点就点 → 提醒大声读出来，提醒期间倒计时暂停。
  // 暂停模拟时钟、手动拨动时间：每个字精确停留 0.65 秒，结果与机器快慢无关。
  // 暂停时时间先快进，第一个字已停留很久不算快，所以连点 5 次（最近 4 次都快）
  await page.clock.pauseAt(new Date('2026-10-19T10:01:00'))
  const seen: string[] = []
  for (let i = 0; i < 5; i++) {
    seen.push((await page.getByTestId('kai-char').getAttribute('aria-label'))!)
    await page.clock.runFor(650)
    await page.getByRole('button', { name: '认识' }).tap()
  }
  const reminder = page.getByRole('dialog', { name: '专注提醒' })
  await expect(reminder).toBeVisible()
  const timerBefore = await page.getByTestId('flash-timer').textContent()
  await expect(reminder.getByRole('button', { name: /准备中/ })).toBeDisabled()
  // 提醒的倒计时每秒接力一次，逐秒拨动时钟
  for (let i = 0; i < 6; i++) await page.clock.runFor(1_000)
  await expect(page.getByTestId('flash-timer')).toHaveText(timerBefore!)
  await reminder.getByRole('button', { name: '我准备好了' }).tap()
  await expect(reminder).toBeHidden()
  await page.clock.resume()

  // 之后放慢：每个字停留 1.2 秒再点
  for (let i = 0; i < 2; i++) {
    seen.push((await page.getByTestId('kai-char').getAttribute('aria-label'))!)
    await page.clock.runFor(1_200)
    await page.getByRole('button', { name: i === 1 ? '跳过' : '认识' }).tap()
  }
  await page.clock.runFor(91_000)
  await expect(page.getByRole('heading', { name: /时间到！看看拼音，刚才读错的字点一下/ })).toBeVisible()
  const items = page.locator('.review-item')
  await expect(items).toHaveCount(6)
  await items.first().tap()
  await expect(items.first()).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: '完成，看成绩' }).tap()
  await expect(page.getByTestId('round-score')).toHaveText('5 个字')
  await expect(page.getByTestId('new-best')).toBeVisible()
  // 5/7 ≈ 71%：难度不变
  await expect(page.getByTestId('level-change')).toHaveAttribute('data-text', '下一关还是难度 1：当前课')

  // 读错（第 1 个）和跳过（第 7 个）的字中，已学的第二天出现在错字 Boss；下一课预习的字不算
  const learned = learnedUpTo('g2a-k12')
  const expected = [seen[0], seen[6]].filter((c) => learned.has(c)).length
  await page.clock.setSystemTime(new Date('2026-10-20T10:00:00'))
  await page.goto('/#/boss')
  await page.reload()
  if (expected) await expect(page.getByTestId('boss-remaining')).toHaveText(`还剩 ${expected} 个`)
  else await expect(page.getByRole('heading', { name: '今天没有要打的 Boss' })).toBeVisible()
})

test('radical detective: three wrong answers in a row bring up the focus reminder', async ({ page }) => {
  test.setTimeout(60_000)
  await page.clock.install({ time: new Date('2026-10-19T10:00:00') })
  await setProgress(page, '二年级上册', '寒号鸟')
  await page.getByRole('link', { name: /部首侦探/ }).tap()
  await page.getByRole('button', { name: '开始破案' }).tap()

  // 选项出现后要先想一想，不能马上点
  await expect(page.locator('.option').first()).toBeDisabled()
  await expect(page.locator('.think-bar')).toBeVisible()

  for (let i = 0; i < 3; i++) {
    const char = (await page.getByTestId('kai-char').getAttribute('aria-label'))!
    const info = chars[char]
    await page.locator('.option').filter({ hasNotText: info.py[0] }).first().tap()
    const meaning = radicals[info.semantic!].meaning
    await page.locator('.question').nth(1).locator('.option').filter({ hasNotText: meaning }).first().tap()
    await page.getByRole('button', { name: '下一个案子' }).tap()
  }
  const reminder = page.getByRole('dialog', { name: '专注提醒' })
  await expect(reminder).toBeVisible()
  await expect(reminder.getByRole('button', { name: /准备中/ })).toBeDisabled()
  await page.clock.runFor(5_500)
  await reminder.getByRole('button', { name: '我准备好了' }).tap()
  await expect(reminder).toBeHidden()
  await expect(page.getByText('案子 4 / 6')).toBeVisible()
})
