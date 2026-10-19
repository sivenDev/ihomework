// 把字库用到的笔顺数据（hanzi-writer-data）复制到 public/strokes，供描红、默写离线使用。
// 生成的文件不入库，构建前自动运行：npm run data:strokes
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'

const SRC = 'node_modules/hanzi-writer-data'
const OUT = 'public/strokes'

const generated = JSON.parse(readFileSync('src/data/generated/extension.json', 'utf8')) as {
  families: Record<string, string[]>
}
const chars = new Set([
  ...readFileSync('data/vendor/level1.txt', 'utf8').trim(),
  ...Object.keys(JSON.parse(readFileSync('src/data/generated/chars.json', 'utf8'))),
  // 字族网络中间显示的声旁（如“隹”）不一定是常用字，也需要字形
  ...Object.keys(generated.families),
])

mkdirSync(OUT, { recursive: true })
const missing: string[] = []
let bytes = 0
for (const ch of chars) {
  const from = `${SRC}/${ch}.json`
  if (!existsSync(from)) {
    missing.push(ch)
    continue
  }
  copyFileSync(from, `${OUT}/${ch}.json`)
  bytes += statSync(from).size
}
const level1 = [...readFileSync('data/vendor/level1.txt', 'utf8').trim()]
const missingLevel1 = level1.filter((c) => missing.includes(c))
console.log(`笔顺数据 ${readdirSync(OUT).length} 个字，共 ${(bytes / 1024 / 1024).toFixed(1)} MB；缺少 ${missing.length} 个：${missing.join('')}`)
if (missingLevel1.length) {
  console.error(`错误：一级字表中缺少笔顺数据：${missingLevel1.join('')}`)
  process.exit(1)
}
