import type { Dataset } from '../../../data/types'
import { sample, type Rng } from '../../assessment/logic/sampling'
import { aheadShizi, currentLesson, learnedLessons, learnedShizi, nextLesson, type Progress } from '../../textbook/logic/scope'

const unique = <T,>(list: T[]) => [...new Set(list)]

/** 课外拓展取最常用的多少个字 */
const EXTENSION_TOP = 300

/**
 * 按难度确定出题范围：
 * 1 当前课和下一课 → 2 本册已学 → 3 已学全部 → 4 加上后续课程 → 5 加上课外常用字。
 */
export function poolForLevel(ds: Dataset, progress: Progress, level: number): string[] {
  const learned = learnedShizi(ds.books, progress)
  const current = currentLesson(ds.books, progress)
  const next = nextLesson(ds.books, progress)
  const lessonChars = (l?: { shizi: { char: string }[] }) => l?.shizi.map((r) => r.char) ?? []
  switch (level) {
    case 1:
      return unique([...lessonChars(current), ...lessonChars(next)])
    case 2: {
      const book = current?.book
      return unique(learnedLessons(ds.books, progress).filter((l) => l.book === book).flatMap(lessonChars))
    }
    case 3:
      return learned
    case 4:
      return unique([...learned, ...aheadShizi(ds.books, progress).slice(0, 200)])
    default:
      return unique([...learned, ...aheadShizi(ds.books, progress).slice(0, 200), ...ds.extension.slice(0, EXTENSION_TOP)])
  }
}

// ---------- 读音干扰项 ----------

const TONES: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
}
const MARKED = Object.fromEntries(Object.entries(TONES).flatMap(([base, marks]) => marks.map((m) => [m, base])))

/** 同一个音节的其他声调，例如 qíng → qīng、qǐng、qìng */
export function toneVariants(py: string): string[] {
  const chars = [...py]
  const at = chars.findIndex((c) => MARKED[c])
  if (at === -1) return []
  const base = MARKED[chars[at]]
  return TONES[base].filter((m) => m !== chars[at]).map((m) => [...chars.slice(0, at), m, ...chars.slice(at + 1)].join(''))
}

export interface DetectiveQuestion {
  char: string
  reading: string
  readingOptions: string[]
  meaning: string
  meaningOptions: string[]
  /** 形旁的偏旁写法 */
  semantic: string
  phonetic: string
  phoneticReading?: string
}

/** 部首侦探：只出形声字，且形旁在对照表中、声旁已知。 */
export function detectiveQuestion(ds: Dataset, char: string, rng: Rng = Math.random): DetectiveQuestion | null {
  const info = ds.chars[char]
  if (!info || info.formation !== '形声' || !info.semantic || !info.phonetic) return null
  const radical = ds.radicals[info.semantic]
  if (!radical) return null
  const reading = info.py[0]
  const phoneticReading = ds.chars[info.phonetic]?.py[0]
  const family = (ds.families[info.phonetic] ?? []).map((c) => ds.chars[c]?.py[0]).filter(Boolean)
  // 好的干扰项：声旁本身的读音、同字族其他字的读音、同音节的其他声调
  const candidates = unique([phoneticReading, ...sample(family, family.length, rng), ...sample(toneVariants(reading), 3, rng)]).filter(
    (p): p is string => !!p && p !== reading,
  )
  const randomReadings = sample(Object.keys(ds.chars), 30, rng).map((c) => ds.chars[c].py[0])
  const distractors = unique([...candidates, ...randomReadings]).filter((p) => p !== reading).slice(0, 3)

  const meanings = unique(Object.values(ds.radicals).map((r) => r.meaning)).filter((m) => m !== radical.meaning)
  return {
    char,
    reading,
    readingOptions: sample([reading, ...distractors], 4, rng),
    meaning: radical.meaning,
    meaningOptions: sample([radical.meaning, ...sample(meanings, 2, rng)], 3, rng),
    semantic: radical.label,
    phonetic: info.phonetic,
    phoneticReading,
  }
}

export function detectiveRound(ds: Dataset, pool: string[], count: number, rng: Rng = Math.random): DetectiveQuestion[] {
  const questions: DetectiveQuestion[] = []
  for (const char of sample(pool, pool.length, rng)) {
    const q = detectiveQuestion(ds, char, rng)
    if (q) questions.push(q)
    if (questions.length >= count) break
  }
  return questions
}

// ---------- 字族网络 ----------

export interface FamilyPuzzle {
  phonetic: string
  phoneticReading?: string
  /** 要组出的字：偏旁 → 字 */
  targets: { radical: string; char: string }[]
  /** 可拖动的偏旁卡（含干扰项） */
  radicalOptions: string[]
}

const MAX_TARGETS = 6

/** 选一个字族：范围内至少有 2 个成员；优先还没收藏过的声旁。 */
export function familyPuzzle(
  ds: Dataset,
  scope: string[],
  collected: Set<string>,
  rng: Rng = Math.random,
): FamilyPuzzle | null {
  const inScope = new Set(scope)
  const options = Object.entries(ds.families)
    .map(([phonetic, members]) => {
      const seen = new Set<string>()
      const targets = members
        .filter((c) => inScope.has(c))
        .flatMap((char) => {
          const radical = ds.radicals[ds.chars[char]?.semantic ?? '']?.label
          if (!radical || seen.has(radical)) return []
          seen.add(radical)
          return [{ radical, char }]
        })
        .slice(0, MAX_TARGETS)
      return { phonetic, targets }
    })
    .filter((f) => f.targets.length >= 2)
  if (!options.length) return null
  const fresh = options.filter((f) => !collected.has(f.phonetic))
  const pick = sample(fresh.length ? fresh : options, 1, rng)[0]
  const used = new Set(pick.targets.map((t) => t.radical))
  const allLabels = unique(Object.values(ds.radicals).map((r) => r.label)).filter((l) => !used.has(l))
  return {
    phonetic: pick.phonetic,
    phoneticReading: ds.chars[pick.phonetic]?.py[0],
    targets: pick.targets,
    radicalOptions: sample([...pick.targets.map((t) => t.radical), ...sample(allLabels, 2, rng)], pick.targets.length + 2, rng),
  }
}
