import { expect, test } from '@playwright/test'
import { seed, setupPin } from './helpers'

test('reading check-in completes the daily reading task; finishing a book gives the reward once', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-20T18:00:00') })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '今日任务' })).toBeVisible()
  await seed(page, 'settings', [{ key: 'progressLessonId', value: 'g1a-s3' }])
  await page.reload()

  const task = page.getByTestId('task-reading')
  await expect(task).toHaveAttribute('data-state', 'optional')
  await task.getByRole('link').tap()

  await expect(page.getByRole('heading', { name: '📖 阅读打卡' })).toBeVisible()
  await expect(page.getByRole('button', { name: '打卡', exact: true })).toBeDisabled()
  await page.getByRole('combobox', { name: '书名' }).fill('父与子')
  await page.getByRole('button', { name: '20 分钟' }).tap()
  await page.getByRole('button', { name: '打卡', exact: true }).tap()
  await expect(page.getByRole('status')).toContainText('打卡成功！')
  await expect(page.getByTestId('reading-stats')).toContainText('今天读了 20 分钟')

  await page.getByRole('link', { name: '回到今日任务' }).tap()
  await expect(page.getByTestId('task-reading')).toHaveAttribute('data-state', 'done')
  await expect(page.getByTestId('xp-total')).toContainText('经验值 0')

  // 从推荐书单选一本，读完了
  await page.getByRole('link', { name: /阅读打卡/ }).last().tap()
  await page.getByRole('button', { name: '读《屁屁侦探》' }).tap()
  await expect(page.getByRole('combobox', { name: '书名' })).toHaveValue('屁屁侦探')
  await page.getByRole('button', { name: /这本书读完啦/ }).tap()
  await page.getByRole('button', { name: '打卡', exact: true }).tap()
  await expect(page.getByRole('status')).toContainText('经验值 +20')
  await expect(page.getByTestId('reading-stats')).toContainText('一共读完 1 本书')
  await expect(page.getByTestId('reading-log')).toHaveCount(2)

  // 同一本书再标一次读完，不重复奖励
  await page.getByRole('combobox', { name: '书名' }).fill('《屁屁侦探》')
  await page.getByRole('button', { name: /这本书读完啦/ }).tap()
  await page.getByRole('button', { name: '打卡', exact: true }).tap()
  await expect(page.getByTestId('reading-log')).toHaveCount(3)
  await expect(page.getByRole('status')).toContainText('打卡成功！')
  await expect(page.getByRole('status')).not.toContainText('经验值')
  await page.getByRole('link', { name: '回首页' }).tap()
  await expect(page.getByTestId('xp-total')).toContainText('经验值 20')
})

test('the parent edits the recommended book list', async ({ page }) => {
  await page.goto('/')
  await setupPin(page)
  await page.getByRole('link', { name: '打开推荐书单' }).tap()
  await page.getByRole('button', { name: '删除《父与子》' }).tap()
  await page.getByRole('textbox', { name: '书名' }).fill('故事大王')
  await page.getByRole('textbox', { name: '简介（可选）' }).fill('每天一个小故事')
  await page.getByRole('button', { name: '进阶', exact: true }).tap()
  await page.getByRole('button', { name: '添加', exact: true }).tap()
  await expect(page.getByRole('button', { name: '删除《故事大王》' })).toBeVisible()

  await page.getByRole('link', { name: '返回家长模式' }).tap()
  await page.getByRole('button', { name: '返回孩子模式' }).tap()
  await page.getByRole('link', { name: /阅读打卡/ }).last().tap()
  await expect(page.getByRole('button', { name: '读《故事大王》' })).toBeVisible()
  await expect(page.getByRole('button', { name: '读《父与子》' })).toHaveCount(0)
})
