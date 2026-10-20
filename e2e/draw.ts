import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'

const PADDING = 20 // 与 HanziBoard 的 BOARD_PADDING 一致

/** 按标准笔顺（笔顺数据中的中线）在书写板上模拟手写。 */
export async function drawChar(page: Page, char: string) {
  const board = page.getByTestId('hanzi-board')
  await expect(board).toHaveAttribute('data-state', 'quiz', { timeout: 20_000 })
  // 直接读构建时复制出来的笔顺文件（不经过网络，断网测试和子路径部署下也能用）
  const data = JSON.parse(readFileSync(`public/strokes/${char}.json`, 'utf8')) as { medians: number[][][] }
  const box = (await board.boundingBox())!
  // Hanzi Writer 的坐标：字在 1024 × 1024 的空间里，y 轴向上，下边界为 -124
  const scale = (box.width - 2 * PADDING) / 1024
  const xOffset = PADDING
  const yOffset = 124 * scale + PADDING
  const toScreen = ([x, y]: number[]) => ({ x: box.x + x * scale + xOffset, y: box.y + box.height - yOffset - y * scale })

  for (const median of data.medians) {
    const points = median.map(toScreen)
    await page.mouse.move(points[0].x, points[0].y)
    await page.mouse.down()
    for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 4 })
    await page.mouse.up()
    await page.waitForTimeout(120)
  }
}
