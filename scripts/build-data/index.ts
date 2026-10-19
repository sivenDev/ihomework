// 生成应用使用的字库：npm run data:build
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { parse } from 'yaml'
import type { SemanticRadical } from '../../src/data/types'
import { buildDataset, type VendorChar } from './build'
import { loadTextbookYaml } from './textbook'
import { validateDataset } from './validate'

const OUT = 'src/data/generated'

const level1 = [...readFileSync('data/vendor/level1.txt', 'utf8').trim()]
const hanzi = JSON.parse(readFileSync('data/vendor/hanzi.json', 'utf8')) as Record<string, VendorChar>
const words = readFileSync('data/vendor/words.tsv', 'utf8')
  .trim()
  .split('\n')
  .map((line) => {
    const [w, f] = line.split('\t')
    return { w, f: Number(f) }
  })
const blocklist = new Set(
  readFileSync('data/word-blocklist.txt', 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#')),
)

const radicals = parse(readFileSync('data/semantic-radicals.yaml', 'utf8')) as Record<string, SemanticRadical>

const dataset = buildDataset({ books: loadTextbookYaml(), hanzi, level1, words, blocklist, radicals })
const { errors, warnings } = validateDataset(dataset, level1)

for (const w of warnings) console.warn(`提示：${w}`)
if (errors.length) {
  for (const e of errors) console.error(`错误：${e}`)
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
writeFileSync(`${OUT}/textbook.json`, JSON.stringify({ books: dataset.books }) + '\n')
writeFileSync(`${OUT}/chars.json`, JSON.stringify(dataset.chars) + '\n')
writeFileSync(
  `${OUT}/extension.json`,
  JSON.stringify({ extension: dataset.extension, families: dataset.families, radicals: dataset.radicals }) + '\n',
)

const count = (k: 'shizi' | 'xiezi') => dataset.books.map((b) => `${b.name}${b.lessons.reduce((n, l) => n + l[k].length, 0)}`)
console.log(`识字表：${count('shizi').join('，')}`)
console.log(`写字表：${count('xiezi').join('，')}`)
const covered = Object.values(dataset.chars).filter((c) => c.formation === '形声' && c.semantic && dataset.radicals[c.semantic]).length
const phono = Object.values(dataset.chars).filter((c) => c.formation === '形声').length
console.log(`形旁对照表 ${Object.keys(radicals).length} 项，覆盖形声字 ${covered}/${phono}`)
console.log(`字典 ${Object.keys(dataset.chars).length} 字，拓展字 ${dataset.extension.length} 个，字族 ${Object.keys(dataset.families).length} 个，提示 ${warnings.length} 条`)
