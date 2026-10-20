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

/**
 * 直接往本地数据库写入数据（模拟评估结果、过去的记录等）。应用不会察觉这种写入，写完后要刷新页面。
 * 数据库要先由应用创建（先打开过页面）。
 */
export async function seed(page: Page, table: string, rows: unknown[]) {
  await page.evaluate(
    ([name, data]) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('ihomework')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction(name as string, 'readwrite')
          for (const row of data as unknown[]) tx.objectStore(name as string).put(row)
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
    [table, rows] as const,
  )
}
