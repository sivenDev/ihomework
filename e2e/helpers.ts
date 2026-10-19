import { expect, type Page } from '@playwright/test'

export async function enterPin(page: Page, pin: string) {
  for (const digit of pin) await page.getByRole('button', { name: digit, exact: true }).tap()
}

/** 首次进入家长模式：设置 PIN 并确认。 */
export async function setupPin(page: Page, pin = '2468') {
  await page.getByRole('link', { name: '家长' }).tap()
  await expect(page.getByRole('heading', { name: '设置家长 PIN' })).toBeVisible()
  await enterPin(page, pin)
  await expect(page.getByRole('heading', { name: '再输入一次 PIN' })).toBeVisible()
  await enterPin(page, pin)
  await expect(page.getByRole('heading', { name: '家长模式' })).toBeVisible()
}
