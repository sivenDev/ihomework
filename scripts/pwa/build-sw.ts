// 构建后生成 Service Worker：列出输出目录里的全部文件（应用、字库、笔顺数据、图标），按内容计算版本，
// 写入 sw.js。用法：tsx scripts/pwa/build-sw.ts [输出目录，默认 dist]
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const outDir = process.argv[2] ?? 'dist'
const SKIP = new Set(['sw.js'])

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const files = walk(outDir)
  .map((full) => relative(outDir, full).split(sep).join('/'))
  .filter((path) => !SKIP.has(path) && !path.endsWith('.map'))
  .sort()

const manifest = files.map((path) => {
  const rev = createHash('md5').update(readFileSync(join(outDir, path))).digest('hex').slice(0, 10)
  // 和浏览器请求时的网址一致：每一段按 encodeURIComponent 编码（笔顺文件名是汉字）
  return [path.split('/').map(encodeURIComponent).join('/'), rev]
})
const version = createHash('md5').update(JSON.stringify(manifest)).digest('hex').slice(0, 10)

const template = readFileSync(new URL('./sw.template.js', import.meta.url), 'utf8')
writeFileSync(join(outDir, 'sw.js'), template.replace('__VERSION__', version).replace('__MANIFEST__', JSON.stringify(manifest)))
console.log(`sw.js: ${manifest.length} files, version ${version}`)
