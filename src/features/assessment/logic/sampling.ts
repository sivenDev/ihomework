import type { BookId, Dataset } from '../../../data/types'
import { learnedLessons, learnedShizi, learnedXiezi, type Progress } from '../../textbook/logic/scope'
import type { DictationItem, ExtensionLayer, ExtensionPart, Mark, RecognitionItem, WordsPart } from './types'

export type Rng = () => number

/** 不重复地随机取 n 个（顺序随机）。 */
export function sample<T>(list: T[], n: number, rng: Rng = Math.random): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, Math.max(0, n))
}

/** 每册已学的生字（按册分组）。 */
export function learnedByBook(ds: Dataset, progress: Progress): Map<BookId, string[]> {
  const byBook = new Map<BookId, string[]>()
  const seen = new Set<string>()
  for (const lesson of learnedLessons(ds.books, progress)) {
    for (const r of lesson.shizi) {
      if (seen.has(r.char)) continue
      seen.add(r.char)
      byBook.set(lesson.book, [...(byBook.get(lesson.book) ?? []), r.char])
    }
  }
  return byBook
}

/** 课内认读抽测：每册从已学生字中随机抽 perBook 个，册与册之间按课本顺序排列。 */
export function sampleRecognition(ds: Dataset, progress: Progress, perBook: number, rng: Rng = Math.random): RecognitionItem[] {
  return [...learnedByBook(ds, progress)].flatMap(([book, chars]) =>
    sample(chars, perBook, rng).map((char) => ({ char, book })),
  )
}

export const LAYER_SIZE = 500
export const LAYER_SAMPLE = 10
/** 某一层正确率低于这个值就不再往下测 */
export const LAYER_STOP_ACCURACY = 0.3

/** 拓展认读的字池：未学的课本字和拓展字，按常用程度排序后每 500 字一层。 */
export function extensionPool(ds: Dataset, progress: Progress): string[][] {
  const learned = new Set(learnedShizi(ds.books, progress))
  const textbookLater = ds.books.flatMap((b) => b.lessons.flatMap((l) => l.shizi.map((r) => r.char)))
  const pool = [...new Set([...textbookLater, ...ds.extension])]
    .filter((c) => !learned.has(c) && ds.chars[c])
    .sort((a, b) => (ds.chars[a].rank || Infinity) - (ds.chars[b].rank || Infinity))
  const layers: string[][] = []
  for (let i = 0; i < pool.length; i += LAYER_SIZE) layers.push(pool.slice(i, i + LAYER_SIZE))
  return layers
}

export function startExtension(pool: string[][], rng: Rng = Math.random): ExtensionPart {
  return pool.length ? { layers: [makeLayer(pool[0], rng)], finished: false } : { layers: [], finished: true }
}

function makeLayer(chars: string[], rng: Rng): ExtensionLayer {
  return { size: chars.length, items: sample(chars, LAYER_SAMPLE, rng).map((char) => ({ char })) }
}

const accuracyOf = (items: { result?: Mark }[]) =>
  items.length ? items.filter((i) => i.result === 'correct').length / items.length : 0

/** 一层测完后决定是否进入下一层。 */
export function advanceExtension(part: ExtensionPart, pool: string[][], rng: Rng = Math.random): ExtensionPart {
  const last = part.layers.at(-1)
  if (!last || last.items.some((i) => !i.result)) return part
  if (accuracyOf(last.items) < LAYER_STOP_ACCURACY || part.layers.length >= pool.length) return { ...part, finished: true }
  return { layers: [...part.layers, makeLayer(pool[part.layers.length], rng)], finished: false }
}

/** 听写：从已学的写字表中抽字，配一个由已学字组成的词帮助区分同音字。 */
export function sampleDictation(ds: Dataset, progress: Progress, n: number, rng: Rng = Math.random): DictationItem[] {
  const learned = new Set(learnedShizi(ds.books, progress))
  return sample(learnedXiezi(ds.books, progress), n, rng).map((char) => {
    const word = ds.chars[char]?.words.find((w) => w.length === 2 && [...w].every((c) => learned.has(c)))
    return { char, word: word ?? char }
  })
}

/** 组词：抽 n 个已学字；词语理解：抽 m 个由已学字组成的词。 */
export function sampleWords(ds: Dataset, progress: Progress, n: number, m: number, rng: Rng = Math.random): WordsPart {
  const learnedList = learnedShizi(ds.books, progress)
  const learned = new Set(learnedList)
  const chars = sample(learnedList, n, rng).map((char) => ({ char }))
  const words = [...new Set(learnedList.flatMap((c) => ds.chars[c]?.words ?? []))].filter(
    (w) => [...w].length >= 2 && [...w].every((c) => learned.has(c)),
  )
  return { chars, words: sample(words, m, rng).map((word) => ({ word })) }
}

/** 听写朗读内容：“晴，晴天的晴”，帮助孩子区分同音字。 */
export function dictationPrompt(char: string, word: string): string {
  return word === char ? char : `${char}，${word}的${char}`
}
