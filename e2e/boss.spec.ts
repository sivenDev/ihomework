import { expect, test } from '@playwright/test'
import { drawChar } from './draw'
import { setupPin } from './helpers'

test('boss battle reviews due characters on the 1-2-4 day schedule', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T10:00:00') })
  await page.goto('/')
  await setupPin(page)
  await page.getByRole('link', { name: '打开课本与字库' }).tap()
  await page.getByRole('button', { name: '把“金木水火土”设为当前进度' }).tap()
  await page.getByRole('button', { name: '查看“金木水火土”的字' }).tap()
  // 家长手动加入两个字：“上”要会写，“五”只要求会认
  for (const label of ['上 shàng', '五 wǔ']) {
    await page.getByRole('button', { name: label, exact: true }).first().tap()
    await page.getByRole('button', { name: '加入错字 Boss' }).tap()
    await expect(page.getByRole('button', { name: '已加入错字 Boss' })).toBeVisible()
    await page.getByRole('button', { name: '取消' }).tap()
  }

  // 第二天：两个字都到期
  await page.clock.setSystemTime(new Date('2026-10-20T10:00:00'))
  await page.goto('/#/boss')
  await expect(page.getByTestId('boss-remaining')).toHaveText('还剩 2 个')

  await expect(page.getByTestId('kai-char')).toHaveAttribute('aria-label', '上')
  await page.getByRole('button', { name: '我会读' }).tap()
  await page.getByRole('button', { name: '读对了' }).tap()
  await drawChar(page, '上')
  await expect(page.getByRole('heading', { name: '打中了！' })).toBeVisible()
  await page.getByRole('button', { name: '下一个' }).tap()

  await expect(page.getByTestId('boss-remaining')).toHaveText('还剩 1 个')
  await expect(page.getByTestId('kai-char')).toHaveAttribute('aria-label', '五')
  await page.getByRole('button', { name: '我会读' }).tap()
  await page.getByRole('button', { name: '读错了' }).tap()
  await expect(page.getByRole('heading', { name: '没关系，明天再来打它' })).toBeVisible()
  await page.getByRole('button', { name: '完成' }).tap()
  await expect(page.getByRole('heading', { name: '今天的 Boss 被你打败了！' })).toBeVisible()

  // 答错的“五”第二天回来；答对一次的“上”隔 2 天才回来
  await page.clock.setSystemTime(new Date('2026-10-21T10:00:00'))
  await page.reload()
  await expect(page.getByTestId('boss-remaining')).toHaveText('还剩 1 个')
  await expect(page.getByTestId('kai-char')).toHaveAttribute('aria-label', '五')
  await page.getByRole('button', { name: '我会读' }).tap()
  await page.getByRole('button', { name: '读对了' }).tap()
  await page.getByRole('button', { name: '完成' }).tap()

  await page.clock.setSystemTime(new Date('2026-10-22T10:00:00'))
  await page.reload()
  await expect(page.getByTestId('boss-remaining')).toHaveText('还剩 1 个')
  await expect(page.getByTestId('kai-char')).toHaveAttribute('aria-label', '上')
})

test('a defeated character comes back for checks on day 7 and day 15, then is mastered', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T10:00:00') })
  await page.goto('/')
  await setupPin(page)
  await page.getByRole('link', { name: '打开课本与字库' }).tap()
  await page.getByRole('button', { name: '把“金木水火土”设为当前进度' }).tap()
  await page.getByRole('button', { name: '查看“金木水火土”的字' }).tap()
  await page.getByRole('button', { name: '五 wǔ', exact: true }).tap()
  await page.getByRole('button', { name: '加入错字 Boss' }).tap()
  await expect(page.getByRole('button', { name: '已加入错字 Boss' })).toBeVisible()

  const reviewOn = async (day: string) => {
    await page.clock.setSystemTime(new Date(`${day}T10:00:00`))
    await page.goto('/#/boss')
    await page.reload()
    await expect(page.getByTestId('boss-remaining')).toHaveText('还剩 1 个')
    await page.getByRole('button', { name: '我会读' }).tap()
    await page.getByRole('button', { name: '读对了' }).tap()
    await page.getByRole('button', { name: '完成' }).tap()
  }

  // 第 1、2、4 天各答对一次 → 打败（10-26）
  for (const day of ['2026-10-20', '2026-10-22', '2026-10-26']) await reviewOn(day)
  await expect(page.getByTestId('checking')).toContainText('五')

  // 打败后第 6 天还没到复查
  await page.clock.setSystemTime(new Date('2026-11-01T10:00:00'))
  await page.reload()
  await expect(page.getByRole('heading', { name: '今天没有要打的 Boss' })).toBeVisible()

  // 第 7 天复查
  await page.clock.setSystemTime(new Date('2026-11-02T10:00:00'))
  await page.reload()
  await expect(page.getByTestId('check-badge')).toBeVisible()
  await page.getByRole('button', { name: '我会读' }).tap()
  await page.getByRole('button', { name: '读对了' }).tap()
  await page.getByRole('button', { name: '完成' }).tap()

  // 第 15 天第二次复查，答对后彻底记住
  await reviewOn('2026-11-10')
  await expect(page.getByTestId('mastered')).toContainText('五')
  await page.clock.setSystemTime(new Date('2026-12-31T10:00:00'))
  await page.reload()
  await expect(page.getByRole('heading', { name: '今天没有要打的 Boss' })).toBeVisible()
})
