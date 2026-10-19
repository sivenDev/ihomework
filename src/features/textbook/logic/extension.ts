import type { Dataset } from '../../../data/types'
import { aheadShizi, learnedShizi, type Progress } from './scope'

export interface ExtensionOptions {
  allowAhead: boolean
  /** 已经掌握的字，不再作为拓展候选 */
  mastered: Set<string>
  limit?: number
}

export interface ExtensionCandidates {
  /** ① 超前学习：后续课程的生字（家长开启时） */
  ahead: string[]
  /** ② 字族课外字：与已学字同声旁的课外常用字 */
  family: string[]
  /** ③ 拓展字库：按常用程度排序 */
  frequent: string[]
}

export function extensionCandidates(ds: Dataset, progress: Progress, opts: ExtensionOptions): ExtensionCandidates {
  const limit = opts.limit ?? 50
  const learned = new Set(learnedShizi(ds.books, progress))
  const extensionSet = new Set(ds.extension)
  const usable = (c: string) => !learned.has(c) && !opts.mastered.has(c)

  const ahead = opts.allowAhead ? aheadShizi(ds.books, progress).filter(usable).slice(0, limit) : []

  const phonetics = new Set<string>()
  for (const ch of learned) {
    const p = ds.chars[ch]?.phonetic
    if (p) phonetics.add(p)
    if (ds.families[ch]) phonetics.add(ch)
  }
  const family = [...phonetics]
    .flatMap((p) => ds.families[p] ?? [])
    .filter((c, i, arr) => arr.indexOf(c) === i && extensionSet.has(c) && usable(c))
    .sort((a, b) => ds.chars[a].rank - ds.chars[b].rank)
    .slice(0, limit)

  const frequent = ds.extension.filter(usable).slice(0, limit)

  return { ahead, family, frequent }
}
