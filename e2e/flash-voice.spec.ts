import { expect, test, type Page } from '@playwright/test'
import { setupPin } from './helpers'

/** 用 Web Audio 的振荡器做一个可控的“麦克风”：window.__voice(true) 相当于孩子开口 */
async function fakeMicrophone(page: Page, { deny = false } = {}) {
  await page.addInitScript((deny) => {
    let ctx: AudioContext | undefined
    let gain: GainNode | undefined
    let stream: MediaStream | undefined
    const setup = () => {
      if (ctx) return
      ctx = new AudioContext()
      const osc = ctx.createOscillator()
      osc.frequency.value = 220
      gain = ctx.createGain()
      gain.gain.value = 0
      const dest = ctx.createMediaStreamDestination()
      osc.connect(gain)
      gain.connect(dest)
      osc.start()
      stream = dest.stream
    }
    navigator.mediaDevices.getUserMedia = async () => {
      if (deny) throw new DOMException('denied', 'NotAllowedError')
      setup()
      await ctx!.resume()
      return stream!
    }
    ;(window as unknown as { __voice: (on: boolean) => void }).__voice = (on: boolean) => {
      setup()
      gain!.gain.value = on ? 0.4 : 0
    }
  }, deny)
}

const voice = (page: Page, on: boolean) => page.evaluate((on) => (window as unknown as { __voice: (on: boolean) => void }).__voice(on), on)

async function openFlash(page: Page) {
  await page.goto('/')
  await setupPin(page)
  await page.getByRole('link', { name: '打开课本与字库' }).tap()
  await page.getByRole('tab', { name: '二年级上册' }).tap()
  await page.getByRole('button', { name: '把“寒号鸟”设为当前进度' }).tap()
  await page.goto('/#/flash')
}

test('voice mode advances after each spoken character and lets the child listen back', async ({ page }) => {
  await fakeMicrophone(page)
  await openFlash(page)
  await page.getByRole('button', { name: '🎤 用声音闯关' }).tap()
  await expect(page.getByTestId('mic-meter')).toBeVisible()
  await page.waitForTimeout(700) // 先让开口检测估计环境噪音

  const read: string[] = []
  for (let i = 0; i < 3; i++) {
    const char = (await page.getByTestId('kai-char').getAttribute('aria-label'))!
    read.push(char)
    await voice(page, true)
    await expect(page.getByTestId('mic-meter')).toHaveAttribute('data-speaking', 'true')
    await page.waitForTimeout(400)
    await voice(page, false)
    // 停顿约 0.6 秒后自动换下一个字
    await expect(page.getByTestId('kai-char')).not.toHaveAttribute('aria-label', char, { timeout: 3000 })
  }
  await expect(page.getByTestId('flash-timer')).toContainText('已读 3 个')

  await page.getByRole('button', { name: '跳过' }).tap()
  await page.getByRole('button', { name: '提前结束' }).tap()
  await expect(page.getByRole('heading', { name: /听一听自己读的/ })).toBeVisible()

  // 每个读过的字都有自己的录音
  for (const c of read) await expect(page.getByRole('button', { name: `听我读的“${c}”` })).toBeEnabled()
  const cell = page.locator('.review-cell').first()
  await page.getByRole('button', { name: `听我读的“${read[0]}”` }).tap()
  await expect(cell).toHaveAttribute('data-playing', 'true')
  await expect(cell).toHaveAttribute('data-playing', 'false', { timeout: 5000 })

  await page.locator('.review-item').first().tap()
  await page.getByRole('button', { name: '完成，看成绩' }).tap()
  await expect(page.getByTestId('round-score')).toHaveText('2 个字')
})

test('voice mode ignores a short bump and keeps waiting', async ({ page }) => {
  await fakeMicrophone(page)
  await openFlash(page)
  await page.getByRole('button', { name: '🎤 用声音闯关' }).tap()
  await page.waitForTimeout(700)
  const char = (await page.getByTestId('kai-char').getAttribute('aria-label'))!
  await voice(page, true)
  await page.waitForTimeout(60)
  await voice(page, false)
  await page.waitForTimeout(1200)
  await expect(page.getByTestId('kai-char')).toHaveAttribute('aria-label', char)
})

test('falls back to buttons when the microphone is not allowed', async ({ page }) => {
  await fakeMicrophone(page, { deny: true })
  await openFlash(page)
  await page.getByRole('button', { name: '🎤 用声音闯关' }).tap()
  await expect(page.getByRole('status').filter({ hasText: '没有麦克风权限' })).toBeVisible()
  await expect(page.getByRole('button', { name: '认识' })).toBeVisible()
})
