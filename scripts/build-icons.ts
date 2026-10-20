// 生成 PWA 应用图标（PNG），结果提交到 public/icons/。修改图标设计后运行：npx tsx scripts/build-icons.ts
import { chromium } from '@playwright/test'

/** 朱红底、白色“字”，下方一道青绿色笔画；maskable 版铺满背景，内容在中间 60% 的安全区内。 */
function svg(size: number, maskable: boolean): string {
  const r = maskable ? 0 : size * 0.22
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${(r / size) * 100}" fill="#c8553d"/>
  <text x="50" y="${maskable ? 60 : 62}" font-size="${maskable ? 44 : 58}" text-anchor="middle" fill="#fffdf8"
    font-family="'PingFang SC','Noto Sans CJK SC','Microsoft YaHei',sans-serif" font-weight="700">字</text>
  <rect x="${maskable ? 34 : 28}" y="${maskable ? 69 : 78}" width="${maskable ? 32 : 44}" height="${maskable ? 4 : 5}" rx="2" fill="#d8efe9"/>
</svg>`
}

const outputs = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: true },
]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const o of outputs) {
  await page.setViewportSize({ width: o.size, height: o.size })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(o.size, o.maskable)}</body></html>`)
  await page.screenshot({ path: `public/icons/${o.file}`, omitBackground: true })
}
await page.setContent('')
await browser.close()
console.log(`wrote ${outputs.length} icons to public/icons/`)
