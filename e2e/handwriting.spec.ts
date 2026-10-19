import { expect, test, type Page } from '@playwright/test'
import { drawChar } from './draw'
import { setupPin } from './helpers'

async function setProgress(page: Page, lesson: string) {
  await page.goto('/')
  await setupPin(page)
  await page.getByRole('link', { name: '打开课本与字库' }).tap()
  await page.getByRole('button', { name: `把“${lesson}”设为当前进度` }).tap()
  await page.getByRole('link', { name: '返回家长模式' }).tap()
  await page.getByRole('button', { name: '返回孩子模式' }).tap()
}

test('trace then write a character from the current lesson', async ({ page }) => {
  await setProgress(page, '金木水火土')
  await page.getByRole('link', { name: /写字练习/ }).tap()
  await page.getByRole('button', { name: '练习“上”' }).tap()

  await expect(page.getByText('第 1 步：描红')).toBeVisible()
  await drawChar(page, '上')
  await expect(page.getByText('第 2 步：默写')).toBeVisible()
  await drawChar(page, '上')
  await expect(page.getByRole('status')).toContainText('写对了！')
  await expect(page.getByRole('button', { name: '练习“上”，写对了！' })).toBeVisible()
})

test('a character the child cannot write goes to the error boss', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-19T10:00:00') })
  await setProgress(page, '金木水火土')
  await page.getByRole('link', { name: /写字练习/ }).tap()
  await page.getByRole('button', { name: '练习“二”' }).tap()
  await drawChar(page, '二')
  await expect(page.getByTestId('hanzi-board')).toHaveAttribute('data-state', 'quiz', { timeout: 20_000 })
  await page.getByRole('button', { name: '写不出，看答案' }).tap()
  await expect(page.getByRole('status')).toContainText('先记住笔顺，明天再写')

  await page.getByRole('link', { name: '回首页' }).tap()
  await page.getByRole('link', { name: /错字 Boss/ }).tap()
  await expect(page.getByRole('heading', { name: '今天没有要打的 Boss' })).toBeVisible()

  await page.clock.setSystemTime(new Date('2026-10-20T10:00:00'))
  await page.reload()
  await expect(page.getByTestId('boss-remaining')).toHaveText('还剩 1 个')
  await expect(page.getByTestId('kai-char')).toHaveAttribute('aria-label', '二')
})

test('random scribbles are not accepted as a character', async ({ page }) => {
  await setProgress(page, '金木水火土')
  await page.getByRole('link', { name: /写字练习/ }).tap()
  await page.getByRole('button', { name: '练习“上”' }).tap()
  await drawChar(page, '上')
  const board = page.getByTestId('hanzi-board')
  await expect(board).toHaveAttribute('data-state', 'quiz', { timeout: 20_000 })
  const box = (await board.boundingBox())!
  // 从右上到左下的斜线，与“上”的任何一笔都不符
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.15)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.85, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(150)
  }
  await expect(board).toHaveAttribute('data-state', 'quiz')
  await expect(board).toHaveAttribute('data-result', '')
  await page.getByRole('button', { name: '写不出，看答案' }).tap()
  await expect(page.getByRole('status')).toContainText('先记住笔顺，明天再写')
})
