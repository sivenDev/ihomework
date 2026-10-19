import { expect, test } from '@playwright/test'

test('browsers without speech synthesis are told to open the site in Chrome', async ({ page }) => {
  // 模拟基于安卓 WebView 的手机自带浏览器：没有 speechSynthesis
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, 'speechSynthesis')
    Reflect.deleteProperty(Window.prototype, 'speechSynthesis')
  })
  await page.goto('/#/')
  const notice = page.getByRole('status').filter({ hasText: '这个浏览器不支持朗读' })
  await expect(notice).toBeVisible()
  await expect(notice.getByRole('link', { name: '用 Chrome 打开' })).toHaveAttribute(
    'href',
    'intent://localhost:5174/#/#Intent;scheme=http;package=com.android.chrome;end',
  )

  await notice.getByRole('button', { name: '知道了' }).tap()
  await expect(notice).toBeHidden()
  await page.reload()
  await expect(page.getByRole('status').filter({ hasText: '这个浏览器不支持朗读' })).toBeHidden()
})

test('browsers with speech synthesis do not show the Chrome notice', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(2_500)
  await expect(page.getByText('这个浏览器不支持朗读')).toBeHidden()
})

test('the temporary diagnostic page is gone', async ({ page }) => {
  await page.goto('/#/speech-check')
  await expect(page.getByRole('heading', { name: '汉字闯关' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '语音检测' })).toBeHidden()
})
