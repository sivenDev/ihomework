import { pinyin } from 'pinyin-pro'
import type { Book, CharInfo, Dataset, Formation, Structure } from '../../src/data/types'

export interface VendorChar {
  r: string
  d: string
  e: { t: string; s?: string; p?: string } | null
  n: number
  f: number
  l1: number
}

export interface BuildInput {
  books: Book[]
  hanzi: Record<string, VendorChar>
  level1: string[]
  words: { w: string; f: number }[]
  blocklist: Set<string>
}

const WORDS_PER_CHAR = 6

const STRUCTURE: Record<string, Structure> = {
  '⿰': '左右',
  '⿱': '上下',
  '⿲': '左中右',
  '⿳': '上中下',
  '⿴': '包围',
  '⿵': '包围',
  '⿶': '包围',
  '⿷': '包围',
  '⿸': '包围',
  '⿹': '包围',
  '⿺': '包围',
  '⿻': '其他',
}

const FORMATION: Record<string, Formation> = {
  pictographic: '象形',
  ideographic: '会意',
  pictophonetic: '形声',
}

export function structureOf(decomposition: string): Structure {
  const first = [...decomposition][0]
  if (!first || first === '？' || [...decomposition].length === 1) return '独体'
  return STRUCTURE[first] ?? '其他'
}

export function textbookChars(books: Book[]): Set<string> {
  const set = new Set<string>()
  for (const b of books)
    for (const l of b.lessons) {
      for (const r of [...l.shizi, ...l.duoyin]) set.add(r.char)
      for (const c of l.xiezi) set.add(c)
    }
  return set
}

export function buildDataset(input: BuildInput): Dataset {
  const { books, hanzi, level1, blocklist } = input
  const inTextbook = textbookChars(books)

  // 课本读音：按出现顺序，生字读音在前，多音字的新读音在后
  const readings = new Map<string, string[]>()
  const addReading = (ch: string, py: string) => {
    const list = readings.get(ch) ?? []
    if (!list.includes(py)) list.push(py)
    readings.set(ch, list)
  }
  for (const b of books) for (const l of b.lessons) for (const r of l.shizi) addReading(r.char, r.py)
  for (const b of books) for (const l of b.lessons) for (const r of l.duoyin) addReading(r.char, r.py)

  const all = [...new Set([...level1, ...inTextbook])]
  const rankOf = new Map(
    [...all].sort((a, b) => (hanzi[b]?.f ?? 0) - (hanzi[a]?.f ?? 0)).map((ch, i) => [ch, i + 1]),
  )

  const wordsByChar = new Map<string, { w: string; f: number; familiar: boolean }[]>()
  for (const { w, f } of input.words) {
    if (blocklist.has(w)) continue
    const chars = [...w]
    const familiar = chars.every((c) => inTextbook.has(c))
    for (const c of new Set(chars)) {
      const list = wordsByChar.get(c) ?? []
      list.push({ w, f, familiar })
      wordsByChar.set(c, list)
    }
  }

  const chars: Record<string, CharInfo> = {}
  for (const ch of all) {
    const v = hanzi[ch]
    const book = readings.get(ch)
    const fallback = pinyin(ch, { toneType: 'symbol', multiple: true, type: 'array' })
    const formation = FORMATION[v?.e?.t ?? ''] ?? '其他'
    const words = (wordsByChar.get(ch) ?? [])
      .sort((a, b) => Number(b.familiar) - Number(a.familiar) || b.f - a.f)
      .slice(0, WORDS_PER_CHAR)
      .map((x) => x.w)
    chars[ch] = {
      py: book ?? [...new Set(fallback)],
      radical: v?.r ?? '',
      strokes: v?.n ?? 0,
      structure: structureOf(v?.d ?? ''),
      formation,
      ...(formation === '形声' && v?.e?.s ? { semantic: v.e.s } : {}),
      ...(formation === '形声' && v?.e?.p ? { phonetic: v.e.p } : {}),
      words,
      rank: rankOf.get(ch) ?? 0,
      level1: v?.l1 ?? 0,
    }
  }

  const extension = level1.filter((c) => !inTextbook.has(c)).sort((a, b) => chars[a].rank - chars[b].rank)

  const familyMap = new Map<string, string[]>()
  for (const [ch, info] of Object.entries(chars)) {
    if (!info.phonetic) continue
    const list = familyMap.get(info.phonetic) ?? []
    list.push(ch)
    familyMap.set(info.phonetic, list)
  }
  const families: Record<string, string[]> = {}
  for (const [p, list] of [...familyMap.entries()].sort((a, b) => b[1].length - a[1].length)) {
    if (list.length >= 2) families[p] = list.sort((a, b) => chars[a].rank - chars[b].rank)
  }

  return { books, chars, extension, families }
}
