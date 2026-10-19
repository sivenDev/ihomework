// 从原始第三方数据中提取字库需要的部分，生成体积小、可以提交的 data/vendor/*。
// 原始数据不入库；用法见 data/textbook/SOURCES.md。
//
//   npx tsx scripts/build-data/prepare-vendor.ts --unihan <dir> --mmah <dictionary.txt> --jieba <dict.txt>

import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { loadTextbookYaml } from './textbook'

const { values } = parseArgs({
  options: { unihan: { type: 'string' }, mmah: { type: 'string' }, jieba: { type: 'string' } },
})
if (!values.unihan || !values.mmah || !values.jieba) {
  throw new Error('usage: prepare-vendor.ts --unihan <dir> --mmah <dictionary.txt> --jieba <dict.txt>')
}

const HAN = /^\p{Script=Han}$/u
const fromCodepoint = (u: string) => String.fromCodePoint(parseInt(u.slice(2), 16))

function unihanField(file: string, field: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const line of readFileSync(`${values.unihan}/${file}`, 'utf8').split('\n')) {
    const [cp, key, value] = line.split('\t')
    if (key === field && cp.startsWith('U+')) out.set(fromCodepoint(cp), value)
  }
  return out
}

// 1. 《通用规范汉字表》一级字：Unihan kTGH 序号 1–3500
const tgh = unihanField('Unihan_OtherMappings.txt', 'kTGH')
const level1 = [...tgh.entries()]
  .map(([ch, v]) => ({ ch, serial: Number(v.split(':')[1]) }))
  .filter((x) => x.serial <= 3500)
  .sort((a, b) => a.serial - b.serial)
if (level1.length !== 3500) throw new Error(`expected 3500 level-1 chars, got ${level1.length}`)

const textbookChars = new Set<string>()
for (const book of loadTextbookYaml()) {
  for (const lesson of book.lessons) {
    for (const r of [...lesson.shizi, ...lesson.duoyin]) textbookChars.add(r.char)
    for (const c of lesson.xiezi) textbookChars.add(c)
  }
}
const wanted = new Set([...level1.map((x) => x.ch), ...textbookChars])

// 2. 字频与组词：jieba 词频表（MIT）
// 组词排除人名、机构名、专有名词等不适合低年级的词性
const EXCLUDED_POS = new Set(['nr', 'nrt', 'nrfg', 'ns', 'nt', 'nz', 'eng', 'x', 'm', 'mq'])
const charFreq = new Map<string, number>()
const words: { w: string; f: number }[] = []
for (const line of readFileSync(values.jieba, 'utf8').split('\n')) {
  const [w, f, pos] = line.split(' ')
  const freq = Number(f)
  if (!w || !freq) continue
  for (const ch of w) charFreq.set(ch, (charFreq.get(ch) ?? 0) + freq)
  const chars = [...w]
  if (EXCLUDED_POS.has(pos)) continue
  if (chars.length >= 2 && chars.length <= 4 && chars.every((c) => wanted.has(c))) words.push({ w, f: freq })
}
words.sort((a, b) => b.f - a.f)
const perChar = new Map<string, number>()
const keptWords: string[] = []
for (const { w, f } of words) {
  const chars = [...w]
  if (chars.some((c) => (perChar.get(c) ?? 0) < 12)) {
    keptWords.push(`${w}\t${f}`)
    for (const c of chars) perChar.set(c, (perChar.get(c) ?? 0) + 1)
  }
}

// 3. 部首、构字、笔画：Make Me a Hanzi dictionary.txt（LGPL-3.0）+ Unihan kTotalStrokes
const totalStrokes = unihanField('Unihan_IRGSources.txt', 'kTotalStrokes')
interface MmahEntry {
  character: string
  radical?: string
  decomposition?: string
  etymology?: { type: string; semantic?: string; phonetic?: string }
  matches?: unknown[]
}
const mmah = new Map<string, MmahEntry>()
for (const line of readFileSync(values.mmah, 'utf8').split('\n')) {
  if (!line.trim()) continue
  const e = JSON.parse(line) as MmahEntry
  if (wanted.has(e.character)) mmah.set(e.character, e)
}

const hanzi: Record<string, unknown> = {}
const serial = new Map(level1.map((x) => [x.ch, x.serial]))
for (const ch of [...wanted].sort()) {
  if (!HAN.test(ch)) continue
  const e = mmah.get(ch)
  hanzi[ch] = {
    r: e?.radical ?? '',
    d: e?.decomposition ?? '',
    e: e?.etymology ? { t: e.etymology.type, s: e.etymology.semantic, p: e.etymology.phonetic } : null,
    n: e?.matches?.length ?? Number((totalStrokes.get(ch) ?? '0').split(' ')[0]),
    f: charFreq.get(ch) ?? 0,
    l1: serial.get(ch) ?? 0,
  }
}

writeFileSync('data/vendor/level1.txt', level1.map((x) => x.ch).join('') + '\n')
writeFileSync('data/vendor/hanzi.json', JSON.stringify(hanzi) + '\n')
writeFileSync('data/vendor/words.tsv', keptWords.join('\n') + '\n')
console.log(
  `level1 ${level1.length}, hanzi ${Object.keys(hanzi).length}, missing mmah ${[...wanted].filter((c) => !mmah.has(c)).join('')}, words ${keptWords.length}`,
)
