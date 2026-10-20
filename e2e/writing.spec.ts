import { expect, test, type Page } from '@playwright/test'
import { enterPin, seed, setupPin } from './helpers'

/** 1×1 的 PNG，当作“拍的照片” */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

const CLUES: [string, string][] = [
  ['时间', '星期天下午'],
  ['地点', '公园里'],
  ['人物', '小明和小狗'],
  ['事件', '踢球'],
]

async function next(page: Page) {
  await page.getByRole('button', { name: '下一步', exact: true }).tap()
}

async function addPicture(page: Page) {
  await page.getByLabel('添加写作图片').setInputFiles({ name: 'scene.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByRole('img', { name: '第 1 幅图' })).toBeVisible()
}

/** 从“找线索”的某一条开始，走完剩下的步骤并交给家长。 */
async function finishCase(page: Page, fromClue = 0) {
  for (let i = fromClue; i < CLUES.length; i++) {
    const [label, text] = CLUES[i]
    await page.getByRole('textbox', { name: label, exact: true }).fill(text)
    if (i < CLUES.length - 1) await page.getByRole('button', { name: '下一条线索' }).tap()
  }
  await next(page)

  await expect(page.getByTestId('step-reason')).toBeVisible()
  await page.getByRole('textbox', { name: '因为', exact: true }).fill('天气很好')
  await page.getByRole('textbox', { name: '所以', exact: true }).fill('小明去公园踢球')
  await page.getByRole('textbox', { name: '结果', exact: true }).fill('小狗也来一起玩')
  await next(page)

  await expect(page.getByTestId('step-report')).toContainText('因为天气很好，所以小明去公园踢球，结果小狗也来一起玩。')
  await page.getByRole('textbox', { name: '我的报告' }).fill('星期天下午，小明在公园里踢球。小狗跑过来了。他们玩得很开心。')
  await next(page)

  await expect(page.getByTestId('step-upgrade')).toBeVisible()
  await page.getByRole('button', { name: '小狗跑过来了。' }).tap()
  await page.getByRole('button', { name: '1 级', exact: true }).tap()
  await page.getByRole('textbox', { name: '改写后的句子' }).fill('一只小白狗摇着尾巴跑过来了。')
  await page.getByRole('button', { name: '交给家长评分' }).tap()
  await expect(page.getByTestId('writing-submitted')).toContainText('报告已经交给家长评分啦')
}

/** 家长给最新交上来的作文打分并勾选“达到等级目标”。 */
async function scoreLatest(page: Page, level: number) {
  await page.getByRole('link', { name: '打开看图写作评分' }).tap()
  await page.getByRole('link', { name: '评分' }).first().tap()
  await expect(page.getByText('一只小白狗摇着尾巴跑过来了。')).toBeVisible()
  await expect(page.getByRole('img', { name: '第 1 幅图' })).toBeVisible()
  for (const item of ['要素', '顺序', '句子', '细节', '书写']) await page.getByRole('button', { name: `${item} 3 分` }).tap()
  await page.getByRole('radio', { name: new RegExp(`^达到 ${level} 级目标`) }).tap()
  await page.getByRole('button', { name: '保存评分' }).tap()
  await expect(page.getByRole('heading', { name: '写作等级' })).toBeVisible()
}

test('picture writing: full case with a picture, resume after leaving, parent scores it into the history', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /侦探看图写作/ }).tap()
  await expect(page.getByTestId('writing-level')).toContainText('我的写作等级：1 级')
  await page.getByRole('button', { name: '开始新案件' }).tap()

  await expect(page.getByTestId('step-images')).toBeVisible()
  await expect(page.getByRole('button', { name: '下一步', exact: true })).toBeDisabled()
  await addPicture(page)
  await next(page)

  // 找了两条线索就离开
  await expect(page.getByRole('button', { name: '朗读：这件事发生在什么时候？' })).toBeVisible()
  await page.getByRole('textbox', { name: '时间', exact: true }).fill(CLUES[0][1])
  await page.getByRole('button', { name: '下一条线索' }).tap()
  await page.getByRole('textbox', { name: '地点', exact: true }).fill(CLUES[1][1])
  await page.getByRole('link', { name: '回首页' }).tap()
  await expect(page.getByRole('heading', { name: '今日任务' })).toBeVisible()

  // 刷新后回来：从第三条线索继续，已经找到的线索还在
  await page.reload()
  await page.getByRole('link', { name: /侦探看图写作/ }).tap()
  await expect(page.getByTestId('step-clues')).toBeVisible()
  await expect(page.getByRole('heading', { name: '找线索 3 / 4：人物' })).toBeVisible()
  await expect(page.getByRole('list', { name: '找到的线索' })).toContainText('时间：星期天下午')
  await expect(page.getByRole('list', { name: '找到的线索' })).toContainText('地点：公园里')
  await finishCase(page, 2)

  await page.getByRole('link', { name: '回首页' }).tap()
  await setupPin(page)
  await scoreLatest(page, 1)
  await expect(page.getByTestId('writing-history')).toHaveCount(1)
  await expect(page.getByTestId('writing-history')).toContainText('1 级 · 15 / 15 分')
  await expect(page.getByTestId('writing-history')).toContainText('达到等级目标')
})

test('picture writing: reaching the level goal twice lets the parent level up, which gives XP', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '今日任务' })).toBeVisible()
  // 1 级已经达标过一次
  await seed(page, 'writings', [
    {
      date: '2026-10-18',
      data: {
        status: 'scored',
        step: 'upgrade',
        level: 1,
        goal: 1,
        imageIds: [],
        clues: {},
        story: [],
        report: { text: '' },
        upgrade: { sentence: '', rewrite: '' },
        score: { scores: { elements: 2, order: 2, sentences: 2, details: 2, handwriting: 2 }, total: 10, result: 'level', date: '2026-10-18' },
      },
    },
  ])
  await page.reload()
  await page.getByRole('link', { name: /侦探看图写作/ }).tap()
  await expect(page.getByTestId('writing-hits')).toContainText('已经达标 1 次')
  await expect(page.getByTestId('my-writing')).toHaveCount(1)
  await page.getByRole('button', { name: '开始新案件' }).tap()
  await addPicture(page)
  await next(page)
  await finishCase(page)

  await page.getByRole('link', { name: '回首页' }).tap()
  await setupPin(page)
  await scoreLatest(page, 1)
  await expect(page.getByTestId('writing-history')).toHaveCount(2)
  await expect(page.getByTestId('writing-level-up')).toContainText('可以升到 2 级')
  await page.getByRole('button', { name: '升到 2 级' }).tap()
  await expect(page.getByTestId('parent-writing-level')).toContainText('当前 2 级')
  await expect(page.getByRole('button', { name: /升到/ })).toHaveCount(0)

  await page.getByRole('link', { name: '返回家长模式' }).tap()
  await page.getByRole('button', { name: '返回孩子模式' }).tap()
  await expect(page.getByTestId('xp-total')).toContainText('经验值 5')
  await page.getByRole('link', { name: /侦探看图写作/ }).tap()
  await expect(page.getByTestId('writing-level')).toContainText('我的写作等级：2 级')
  await expect(page.getByTestId('writing-hits')).toContainText('已经达标 0 次')

  // 再进家长模式，等级保持
  await page.getByRole('link', { name: '回首页' }).tap()
  await page.getByRole('link', { name: '家长' }).tap()
  await enterPin(page, '2468')
  await page.getByRole('link', { name: '打开看图写作评分' }).tap()
  await expect(page.getByTestId('parent-writing-level')).toContainText('当前 2 级')
})
