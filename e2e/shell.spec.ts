import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { enterPin, setupPin } from './helpers'

test('first-time parent sets a PIN, then needs it to re-enter', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '汉字闯关' })).toBeVisible()

  await setupPin(page, '2468')
  await page.getByRole('button', { name: '返回孩子模式' }).tap()
  await expect(page.getByRole('heading', { name: '汉字闯关' })).toBeVisible()

  await page.getByRole('link', { name: '家长' }).tap()
  await expect(page.getByRole('heading', { name: '输入家长 PIN' })).toBeVisible()
  await enterPin(page, '1111')
  await expect(page.getByRole('alert')).toHaveText('PIN 不正确，请再试一次。')
  await enterPin(page, '2468')
  await expect(page.getByRole('heading', { name: '家长模式' })).toBeVisible()
})

test('mismatched PIN confirmation restarts setup', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: '家长' }).tap()
  await enterPin(page, '1234')
  await enterPin(page, '4321')
  await expect(page.getByRole('alert')).toHaveText('两次输入不一致，请重新设置。')
  await expect(page.getByRole('heading', { name: '设置家长 PIN' })).toBeVisible()
})

test('tapping a hanzi shows its pinyin', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '闯，chuǎng' }).tap()
  await expect(page.getByTestId('pinyin')).toHaveText('chuǎng')
})

test('backup export, clear and import restores settings and PIN', async ({ page }) => {
  await page.goto('/')
  await setupPin(page, '2468')
  await page.getByRole('button', { name: '15 分钟' }).tap()
  await expect(page.getByRole('button', { name: '15 分钟' })).toHaveAttribute('aria-pressed', 'true')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出备份' }).tap()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^ihomework-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const backupText = await readFile((await download.path())!, 'utf8')

  // 清空本地数据库，模拟换设备
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('ihomework')
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      }),
  )
  await page.goto('/')
  await setupPin(page, '9999')
  await expect(page.getByRole('button', { name: '20 分钟' })).toHaveAttribute('aria-pressed', 'true')

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByLabel('选择备份文件').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backupText),
  })
  await expect(page.getByRole('status').filter({ hasText: '已从备份恢复。' })).toBeVisible()
  await expect(page.getByRole('button', { name: '15 分钟' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: '返回孩子模式' }).tap()
  await page.getByRole('link', { name: '家长' }).tap()
  await enterPin(page, '2468')
  await expect(page.getByRole('heading', { name: '家长模式' })).toBeVisible()
})

test('importing an invalid file shows an error', async ({ page }) => {
  await page.goto('/')
  await setupPin(page)
  await page.getByLabel('选择备份文件').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello":1}'),
  })
  await expect(page.getByRole('status').filter({ hasText: '文件不是汉字闯关的备份文件' })).toBeVisible()
})

test('rest reminder appears after the session limit', async ({ page }) => {
  await page.clock.install()
  await page.goto('/')
  await setupPin(page)
  await page.getByRole('button', { name: '10 分钟' }).tap()
  await page.getByRole('button', { name: '返回孩子模式' }).tap()

  await page.clock.runFor(9 * 60_000)
  await expect(page.getByRole('dialog', { name: '休息一下吧' })).toBeHidden()
  await page.clock.runFor(61_000)
  await expect(page.getByRole('dialog', { name: '休息一下吧' })).toBeVisible()

  await page.getByRole('button', { name: '休息好了，继续' }).tap()
  await expect(page.getByRole('dialog', { name: '休息一下吧' })).toBeHidden()
})
