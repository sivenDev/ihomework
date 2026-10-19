import { readFileSync, readdirSync } from 'node:fs'
import { parse } from 'yaml'
import type { Book, BookId, CharReading, Lesson, LessonKind } from '../../src/data/types'

export const TEXTBOOK_DIR = 'data/textbook'

interface RawLesson {
  id: string
  unit: number
  kind: LessonKind
  num: number
  title: string
  shizi: string
  duoyin: string
  xiezi: string
}

interface RawBook {
  id: BookId
  name: string
  printed: { shizi: number; xiezi: number }
  lessons: RawLesson[]
}

export function parseReadings(text: string, where: string): CharReading[] {
  if (!text.trim()) return []
  return text
    .trim()
    .split(/\s+/)
    .map((token) => {
      const m = /^(\p{Script=Han}):([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+)$/u.exec(token)
      if (!m) throw new Error(`${where}: 无法解析“${token}”，应为“字:拼音”`)
      return { char: m[1], py: m[2] }
    })
}

export function parseBook(raw: RawBook): Book {
  return {
    id: raw.id,
    name: raw.name,
    printed: raw.printed,
    lessons: raw.lessons.map(
      (l): Lesson => ({
        id: l.id,
        book: raw.id,
        unit: l.unit,
        kind: l.kind,
        num: l.num,
        title: String(l.title),
        shizi: parseReadings(l.shizi ?? '', `${l.id}.shizi`),
        duoyin: parseReadings(l.duoyin ?? '', `${l.id}.duoyin`),
        xiezi: [...(l.xiezi ?? '')].filter((c) => c.trim()),
      }),
    ),
  }
}

const ORDER: BookId[] = ['g1a', 'g1b', 'g2a', 'g2b']

export function loadTextbookYaml(dir = TEXTBOOK_DIR): Book[] {
  const files = readdirSync(dir).filter((f) => f.endsWith('.yaml'))
  return files
    .map((f) => parseBook(parse(readFileSync(`${dir}/${f}`, 'utf8')) as RawBook))
    .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id))
}
