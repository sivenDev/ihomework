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

/** 模拟孩子读一个字：开口 0.4 秒后停下，等进入“对一对” */
async function readAloud(page: Page) {
  await voice(page, true)
  await expect(page.getByTestId('mic-meter')).toHaveAttribute('data-speaking', 'true')
  await page.waitForTimeout(400)
  await voice(page, false)
  await expect(page.getByTestId('check-panel')).toBeVisible({ timeout: 3000 })
}

const currentChar = async (page: Page) => (await page.getByTestId('kai-char').first().getAttribute('aria-label'))!

test('voice mode: each reading is checked on the spot, mistakes are read again', async ({ page }) => {
  test.setTimeout(90_000)
  await fakeMicrophone(page)
  await openFlash(page)
  await page.getByRole('button', { name: '🎤 用声音闯关' }).tap()
  await expect(page.getByTestId('mic-meter')).toBeVisible()
  await page.waitForTimeout(700) // 先让开口检测估计环境噪音

  // 第 1 个字：读完马上对一对；播放完之前不能判断；对照期间倒计时不走
  const first = await currentChar(page)
  await readAloud(page)
  const same = page.getByRole('button', { name: '✓ 一样' })
  await expect(same).toBeDisabled()
  const timer = await page.getByTestId('flash-timer').textContent()
  await expect(same).toBeEnabled({ timeout: 6000 })
  await page.waitForTimeout(1200)
  await expect(page.getByTestId('flash-timer')).toHaveText(timer!)
  await same.tap()
  await expect(page.getByTestId('check-panel')).toBeHidden()
  await expect.poll(() => currentChar(page)).not.toBe(first)

  // 第 2 个字：两次都“不一样”→ 提示后放弃，进入下一个字
  const second = await currentChar(page)
  await readAloud(page)
  await page.getByRole('button', { name: '✗ 不一样' }).tap({ timeout: 6000 })
  await expect(page.getByRole('status').filter({ hasText: '再读一遍' })).toBeVisible()
  expect(await currentChar(page)).toBe(second)
  await expect(page.getByTestId('mic-meter')).toBeVisible()
  await page.waitForTimeout(1500) // 等标准读音播完，回到听读
  await readAloud(page)
  await page.getByRole('button', { name: '✗ 不一样' }).tap({ timeout: 6000 })
  await expect(page.getByTestId('check-panel')).toContainText('没关系，记住它')
  await expect.poll(() => currentChar(page), { timeout: 6000 }).not.toBe(second)
  await expect(page.getByTestId('check-panel')).toBeHidden()

  // 第 3 个字：第一次不一样，重读后一样（改正）
  const third = await currentChar(page)
  await readAloud(page)
  await page.getByRole('button', { name: '✗ 不一样' }).tap({ timeout: 6000 })
  await page.waitForTimeout(1500)
  await readAloud(page)
  await page.getByRole('button', { name: '✓ 一样' }).tap({ timeout: 6000 })
  await expect.poll(() => currentChar(page)).not.toBe(third)

  await page.getByRole('button', { name: '提前结束' }).tap()
  await page.getByRole('button', { name: '看成绩' }).tap()
  // 只有第一次就读对的字得分；放弃和改正的字需要多练
  await expect(page.getByTestId('round-score')).toHaveText('1 个字')
  const practice = page.getByLabel('需要多练的字')
  await expect(practice).toContainText(second)
  await expect(practice).toContainText(third)
  await expect(practice).not.toContainText(first)
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
