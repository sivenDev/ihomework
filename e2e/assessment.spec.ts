import { expect, test, type Page } from '@playwright/test'
import { setupPin } from './helpers'

/** 设置进度为一年级上册《金木水火土》：已学 13 个字，写字表 4 个字 */
async function startAt金木水火土(page: Page) {
  await page.goto('/')
  await setupPin(page)
  await page.getByRole('link', { name: '打开课本与字库' }).tap()
  await page.getByRole('button', { name: '把“金木水火土”设为当前进度' }).tap()
  await page.getByRole('link', { name: '返回家长模式' }).tap()
  await page.getByRole('link', { name: '打开现状评估' }).tap()
  await expect(page.getByRole('heading', { name: '现状评估' })).toBeVisible()
}

const partCard = (page: Page, name: string) =>
  page.getByRole('listitem').filter({ has: page.getByRole('heading', { name, exact: true }) })

/** 每次点一个可见的按钮，等题目变化后再继续，直到出现完成标题 */
async function answerUntil(page: Page, doneHeading: string, labels: string[]) {
  const done = page.getByRole('heading', { name: doneHeading, exact: true })
  while (!(await done.isVisible())) {
    const progress = await page.locator('.mark-progress').textContent()
    for (const label of labels) {
      const button = page.getByRole('button', { name: label })
      if (await button.isVisible()) {
        await button.tap()
        break
      }
    }
    await expect(page.locator('.mark-progress').or(done)).not.toHaveText(progress ?? '')
  }
}

async function startRun(page: Page, size = '10 个') {
  await page.getByRole('button', { name: size }).tap()
  await page.getByRole('button', { name: '开始评估' }).tap()
}

/** 依次标记：前 correct 个“对”，其余“错”，直到出现完成提示 */
async function markRecognition(page: Page, title: string, correct: number) {
  let n = 0
  while (!(await page.getByRole('heading', { name: `${title}完成` }).isVisible())) {
    const progress = await page.locator('.mark-progress').textContent()
    await page.getByRole('button', { name: n < correct ? '✓ 读对了' : '✗ 不认识 / 读错' }).tap()
    n++
    await expect(page.locator('.mark-progress').or(page.getByRole('heading', { name: `${title}完成` }))).not.toHaveText(progress ?? '')
  }
  await page.getByRole('link', { name: '返回评估' }).tap()
}

async function markDictation(page: Page, mark: string) {
  await page.getByRole('link', { name: '开始听写' }).tap()
  while (!(await page.getByRole('heading', { name: '听写完成' }).isVisible())) {
    const progress = await page.locator('.mark-progress').textContent()
    await page.getByRole('button', { name: '孩子写完后，显示答案' }).tap()
    await expect(page.getByTestId('dictation-answer')).toBeVisible()
    await page.getByRole('button', { name: mark }).tap()
    await expect(page.locator('.mark-progress').or(page.getByRole('heading', { name: '听写完成' }))).not.toHaveText(progress ?? '')
  }
  await page.getByRole('link', { name: '返回评估' }).tap()
}

test('a full assessment produces a report, and a second one compares and unlocks extension', async ({ page }) => {
  await startAt金木水火土(page)
  await startRun(page)

  await expect(page.getByRole('button', { name: '生成评估报告' })).toBeDisabled()
  await page.getByRole('link', { name: '开始课内认读' }).tap()
  // 已学 13 字，每册最多抽 10 个；8 对 2 错 → 正确率 80%
  await expect(page.locator('.mark-progress')).toContainText('共 10 个')
  await markRecognition(page, '课内认读', 8)
  await expect(partCard(page, '拓展认读')).toContainText('未开放')
  await markDictation(page, '✓ 写对了')

  await page.getByRole('button', { name: '生成评估报告' }).tap()
  await expect(page.getByRole('heading', { name: '评估报告' })).toBeVisible()
  // 0.8 × 13 = 10.4 → 约 10 字
  await expect(page.getByTestId('estimate')).toHaveText('约 10 字')
  await expect(page.getByTestId('route')).toContainText('补漏路线')
  await expect(page.getByTestId('level')).toContainText('建议“标准”')
  await expect(page.getByRole('heading', { name: '待攻克清单（2 个）' })).toBeVisible()

  // 第二次：全对 → 拓展认读开放，第一组全错就停止
  await page.getByRole('link', { name: '返回评估' }).tap()
  await expect(page.getByRole('link', { name: /课内识字量约 10 字/ })).toBeVisible()
  await startRun(page)
  await page.getByRole('link', { name: '开始课内认读' }).tap()
  await markRecognition(page, '课内认读', 10)
  await page.getByRole('link', { name: '开始拓展认读' }).tap()
  await expect(page.locator('.mark-progress')).toContainText('第 1 组')
  await markRecognition(page, '拓展认读', 0)
  await expect(partCard(page, '拓展认读')).toContainText('已完成')
  await markDictation(page, '✓ 写对了')
  await page.getByRole('button', { name: '生成评估报告' }).tap()

  await expect(page.getByTestId('estimate')).toHaveText('约 13 字')
  await expect(page.getByLabel('课内识字量')).toContainText('比上次多 3 字')
  await expect(page.getByLabel('课外识字量')).toContainText('约 0 字')
  await expect(page.getByTestId('route')).toContainText('拓展路线')
})

test('recognition can be paused, resumed and undone', async ({ page }) => {
  await startAt金木水火土(page)
  await startRun(page)
  await page.getByRole('link', { name: '开始课内认读' }).tap()
  for (let i = 0; i < 3; i++) {
    await expect(page.locator('.mark-progress')).toContainText(`第 ${i + 1} 个`)
    await page.getByRole('button', { name: '✓ 读对了' }).tap()
  }
  await page.getByRole('link', { name: '暂停' }).tap()
  await expect(partCard(page, '课内认读')).toContainText('进行中')

  await page.reload()
  await page.getByRole('button', { name: '2', exact: true }).waitFor()
  for (const d of '2468') await page.getByRole('button', { name: d, exact: true }).tap()
  await page.getByRole('link', { name: '继续课内认读' }).tap()
  await expect(page.locator('.mark-progress')).toContainText('第 4 个')
  const third = await page.getByRole('button', { name: /撤销上一个/ }).textContent()
  await page.getByRole('button', { name: /撤销上一个/ }).tap()
  await expect(page.locator('.mark-progress')).toContainText('第 3 个')
  await expect(page.getByTestId('flash-char')).toHaveAttribute('aria-label', third!.match(/（(.)）/)![1])
})

test('words, reading and writing parts can be completed', async ({ page }) => {
  await page.clock.install()
  await startAt金木水火土(page)
  await startRun(page)

  await page.getByRole('link', { name: '开始组词与词语理解' }).tap()
  await answerUntil(page, '完成', ['组出 2 个', '✓ 说对了'])
  await expect(page.getByText('组词得分 20 / 20')).toBeVisible()
  await page.getByRole('link', { name: '返回评估' }).tap()

  await page.getByRole('link', { name: '开始朗读计时' }).tap()
  await page.getByLabel('朗读短文').fill('天上有一个太阳，地上有一棵大树。')
  await expect(page.getByText('共 14 个汉字')).toBeVisible()
  await page.getByRole('button', { name: '开始计时' }).tap()
  await page.clock.runFor(30_000)
  await page.getByRole('button', { name: /卡顿 \+1/ }).tap()
  await page.getByRole('button', { name: '读完了，停止计时' }).tap()
  await expect(page.getByRole('status').filter({ hasText: '用时' })).toHaveText('用时 30 秒，卡顿 1 次，每分钟约 28 字。')
  await page.getByRole('link', { name: '返回' }).tap()

  await page.getByRole('link', { name: '开始看图写作' }).tap()
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  await page.getByLabel('选择写作图片').setInputFiles({ name: 'pic.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByAltText('写作图片')).toBeVisible()
  for (const label of ['要素 3 分', '顺序 2 分', '句子 2 分', '细节 1 分', '书写 2 分']) await page.getByRole('button', { name: label }).tap()
  await expect(page.getByText('总分：10 / 15')).toBeVisible()
  await expect(page.getByRole('button', { name: '完成评分' })).toBeDisabled()
  await page.getByRole('radio', { name: /2 级/ }).tap()
  await page.getByRole('button', { name: '完成评分' }).tap()
  await page.getByRole('link', { name: '返回' }).tap()

  for (const part of ['组词与词语理解', '朗读计时', '看图写作'])
    await expect(partCard(page, part)).toContainText('已完成')
})

test('assessment asks for progress first', async ({ page }) => {
  await page.goto('/')
  await setupPin(page)
  await page.getByRole('link', { name: '打开现状评估' }).tap()
  await expect(page.getByRole('link', { name: '去设置进度' })).toBeVisible()
})
