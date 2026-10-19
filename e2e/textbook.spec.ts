import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { enterPin, setupPin } from './helpers'

async function openTextbook(page: Page) {
  await page.getByRole('link', { name: '打开课本与字库' }).tap()
  await expect(page.getByRole('heading', { name: '课本与字库' })).toBeVisible()
}

test('parent sets the current lesson in any book and it persists', async ({ page }) => {
  await page.goto('/')
  await setupPin(page)
  await openTextbook(page)
  await expect(page.getByTestId('current-progress')).toContainText('还没设置')

  await page.getByRole('tab', { name: '二年级上册' }).tap()
  await page.getByRole('button', { name: '把“寒号鸟”设为当前进度' }).tap()
  await expect(page.getByTestId('current-progress')).toHaveText('二年级上册 · 阅读 12 寒号鸟')

  await page.getByRole('button', { name: '允许超前学习后续课程' }).tap()
  await expect(page.getByRole('button', { name: '允许超前学习后续课程' })).toHaveAttribute('aria-pressed', 'true')

  // 刷新后需要重新输入 PIN，输入后回到原来的页面
  await page.reload()
  await expect(page.getByRole('heading', { name: '输入家长 PIN' })).toBeVisible()
  await enterPin(page, '2468')
  await expect(page.getByRole('heading', { name: '课本与字库' })).toBeVisible()
  await expect(page.getByTestId('current-progress')).toHaveText('二年级上册 · 阅读 12 寒号鸟')
  // 打开时直接显示当前进度所在的册
  await expect(page.getByRole('tab', { name: '二年级上册' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('button', { name: '允许超前学习后续课程' })).toHaveAttribute('aria-pressed', 'true')
})

test('lesson lists match the textbook tables', async ({ page }) => {
  await page.goto('/')
  await setupPin(page)
  await openTextbook(page)
  await page.getByRole('button', { name: '查看“天地人”的字' }).tap()
  for (const [char, py] of [['天', 'tiān'], ['地', 'dì'], ['人', 'rén'], ['你', 'nǐ'], ['我', 'wǒ'], ['他', 'tā']]) {
    await expect(page.getByRole('button', { name: `${char} ${py}`, exact: true })).toBeVisible()
  }
  await expect(page.getByText('生字 6 · 写字 0 · 已核对 0/6')).toBeVisible()
})

test('parent edits flow into tap-to-read and survive backup and restore', async ({ page }) => {
  await page.goto('/')
  await setupPin(page)
  await openTextbook(page)

  await page.getByRole('button', { name: '查看“秋天”的字' }).tap()
  await page.getByRole('button', { name: '来 lái', exact: true }).tap()
  await page.getByLabel('读音').fill('lāi')
  await page.getByRole('button', { name: '保存' }).tap()
  await expect(page.getByRole('button', { name: '来 lāi', exact: true })).toBeVisible()

  await page.getByRole('button', { name: '来 lāi', exact: true }).tap()
  await page.getByRole('button', { name: '标为已核对' }).tap()
  await expect(page.getByRole('button', { name: '来 lāi，已核对' })).toBeVisible()
  await page.getByRole('button', { name: '取消' }).tap()
  await expect(page.getByText('生字 10 · 写字 4 · 已核对 1/10')).toBeVisible()

  await page.getByLabel('给秋天添加字').fill('晴 qíng')
  await page.getByRole('button', { name: '加入识字表' }).tap()
  await expect(page.getByRole('button', { name: '晴 qíng', exact: true })).toBeVisible()
  await expect(page.getByText('生字 11 · 写字 4 · 已核对 1/11')).toBeVisible()

  // 点读使用家长修改的读音
  await page.getByRole('link', { name: '返回家长模式' }).tap()
  await page.getByRole('button', { name: '返回孩子模式' }).tap()
  await page.getByRole('button', { name: '来，lāi' }).tap()
  await expect(page.getByTestId('pinyin')).toHaveText('lāi')

  // 备份 → 清空 → 恢复后修改仍在
  await page.getByRole('link', { name: '家长' }).tap()
  await enterPin(page, '2468')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出备份' }).tap()
  const backup = await readFile((await (await downloadPromise).path())!, 'utf8')
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase('ihomework')
        request.onsuccess = () => resolve()
      }),
  )
  await page.goto('/')
  await setupPin(page, '1357')
  page.once('dialog', (d) => d.accept())
  await page.getByLabel('选择备份文件').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(backup) })
  await expect(page.getByRole('status').filter({ hasText: '已从备份恢复。' })).toBeVisible()
  await openTextbook(page)
  await page.getByRole('button', { name: '查看“秋天”的字' }).tap()
  await expect(page.getByRole('button', { name: '来 lāi，已核对' })).toBeVisible()
  await expect(page.getByRole('button', { name: '晴 qíng', exact: true })).toBeVisible()
})

test('adding a character without pinyin shows a validation message for bad input', async ({ page }) => {
  await page.goto('/')
  await setupPin(page)
  await openTextbook(page)
  await page.getByRole('button', { name: '查看“秋天”的字' }).tap()
  await page.getByLabel('给秋天添加字').fill('ab')
  await page.getByRole('button', { name: '加入识字表' }).tap()
  await expect(page.getByRole('alert')).toContainText('请输入一个汉字')
})
