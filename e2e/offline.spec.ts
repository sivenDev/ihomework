import { readFileSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { drawChar } from './draw'
import { seed, setupPin } from './helpers'

// 这个文件跑在正式构建上（playwright.config.ts 的 offline 项目），地址带 /ihomework/ 子路径，和线上一致。
// 页面内跳转都用 hash 路由；page.goto 用相对地址（'./'），不能用 '/'。
// 两个用例按顺序执行：第二个会临时改动构建出的 sw.js（模拟发布新版本）。
test.describe.configure({ mode: 'serial' })

const SW_FILE = 'dist-e2e/sw.js'

async function openChild(page: Page, hash: string) {
  await page.goto(`./#/${hash}`)
}

test('installable PWA: precaches everything, then a Boss battle, a dictation and the other pages work offline, with no requests to other sites', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(120_000)
  const origin = new URL(baseURL!).origin
  const foreign: string[] = []
  context.on('request', (request) => {
    const url = new URL(request.url())
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== origin) foreign.push(request.url())
  })

  await page.goto('./')
  await expect(page.getByRole('heading', { name: '今日任务' })).toBeVisible()
  // 第一次打开：显示下载进度，下载完提示可以离线使用
  await expect(page.getByTestId('pwa-ready')).toBeVisible({ timeout: 90_000 })
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  // Chrome 的可安装性检查（应用清单、图标、Service Worker）
  const cdp = await context.newCDPSession(page)
  const { installabilityErrors } = (await cdp.send('Page.getInstallabilityErrors')) as { installabilityErrors: unknown[] }
  expect(installabilityErrors).toEqual([])
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector<HTMLLinkElement>('link[rel=manifest]')!.href)).json())
  expect(manifest).toMatchObject({ start_url: './', scope: './', display: 'fullscreen' })

  // 课本进度设到“金木水火土”，“上”是一个今天要打的错字
  await seed(page, 'settings', [{ key: 'progressLessonId', value: 'g1a-s2' }])
  await seed(page, 'bossCards', [{ char: '上', stage: 1, due: '2000-01-01', streak: 0, status: 'active', sources: ['flash'], updatedAt: 0 }])

  // 断网
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: '今日任务' })).toBeVisible()
  await expect(page.getByTestId('task-boss')).toBeVisible()

  // 错字 Boss 战：认读 + 默写（笔顺数据来自离线缓存）
  await openChild(page, 'boss')
  await expect(page.getByTestId('kai-char')).toHaveAttribute('aria-label', '上')
  await page.getByRole('button', { name: '我会读' }).tap()
  await page.getByRole('button', { name: '读对了' }).tap()
  await drawChar(page, '上')
  await expect(page.getByRole('heading', { name: '打中了！' })).toBeVisible()

  // 写字练习：描红后默写
  await openChild(page, 'write')
  await page.getByRole('button', { name: '练习“三”' }).tap()
  await expect(page.getByText('第 1 步：描红')).toBeVisible()
  await drawChar(page, '三')
  await expect(page.getByText('第 2 步：默写')).toBeVisible()
  await drawChar(page, '三')
  await expect(page.getByRole('status').filter({ hasText: '写对了！' })).toBeVisible()

  // 其他页面断网也能打开（按需加载的页面代码也在缓存里）
  for (const [hash, heading] of [
    ['flash', /生字闪认/],
    ['detective', /部首侦探/],
    ['family', /字族网络/],
    ['writing', /侦探看图写作/],
    ['reading', /阅读打卡/],
  ] as const) {
    await openChild(page, hash)
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible()
  }
  await openChild(page, '')
  await setupPin(page)
  await expect(page.getByRole('heading', { name: '识字量' })).toBeVisible()
  await page.getByRole('link', { name: '打开现状评估' }).tap()
  await expect(page.getByRole('heading', { name: /现状评估/ })).toBeVisible()

  expect(foreign).toEqual([])
})

test('a new version waits until the update button is tapped, then the page reloads with it', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('./')
  await expect(page.getByTestId('pwa-ready')).toBeVisible({ timeout: 90_000 })

  // 模拟发布了新版本：换掉 sw.js 里的版本号（长度不变，预览服务器按启动时的文件长度返回）
  const original = readFileSync(SW_FILE, 'utf8')
  const version = original.match(/const VERSION = '([0-9a-f]{10})'/)![1]
  writeFileSync(SW_FILE, original.replace(`'${version}'`, `'${version === 'ffffffffff' ? 'eeeeeeeeee' : 'ffffffffff'}'`))
  try {
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update())

    const status = page.getByRole('status').filter({ hasText: '有新版本了' })
    await expect(status).toBeVisible({ timeout: 30_000 })
    // 没点之前不刷新，页面状态保留
    await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1))
    await expect.poll(() => page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1)

    const reloaded = page.waitForEvent('load', { timeout: 30_000 })
    await status.getByRole('button', { name: '更新' }).tap()
    await reloaded
    expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker ?? null)).toBeNull()
    await expect(page.getByRole('heading', { name: '今日任务' })).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: '有新版本了' })).toHaveCount(0)
  } finally {
    writeFileSync(SW_FILE, original)
  }
})
