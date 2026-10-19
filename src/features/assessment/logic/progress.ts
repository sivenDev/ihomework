import { THRESHOLDS } from './report'
import type { RunData } from './types'

export type PartKey = 'recognition' | 'extension' | 'dictation' | 'words' | 'reading' | 'writing'
export type PartStatus = 'locked' | 'todo' | 'doing' | 'done'

const allMarked = (items: { result?: unknown }[]) => items.length > 0 && items.every((i) => i.result !== undefined)
const someMarked = (items: { result?: unknown }[]) => items.some((i) => i.result !== undefined)

export function recognitionAccuracy(data: RunData): number {
  const items = data.parts.recognition?.items ?? []
  return items.length ? items.filter((i) => i.result === 'correct').length / items.length : 0
}

/** 拓展认读只在课内认读完成且正确率 ≥ 90% 时开放。 */
export function extensionUnlocked(data: RunData): boolean {
  return partStatus(data, 'recognition') === 'done' && recognitionAccuracy(data) >= THRESHOLDS.recognitionStrong
}

export function partStatus(data: RunData, part: PartKey): PartStatus {
  const p = data.parts
  switch (part) {
    case 'recognition': {
      const items = p.recognition?.items ?? []
      return allMarked(items) ? 'done' : someMarked(items) ? 'doing' : 'todo'
    }
    case 'extension':
      if (!extensionUnlocked(data)) return 'locked'
      if (!p.extension) return 'todo'
      return p.extension.finished ? 'done' : 'doing'
    case 'dictation': {
      // 已学的字里还没有写字表的字时，听写没有题目，直接算完成
      if (p.dictation && p.dictation.items.length === 0) return 'done'
      const items = p.dictation?.items ?? []
      return allMarked(items) ? 'done' : someMarked(items) ? 'doing' : 'todo'
    }
    case 'words': {
      if (p.words && p.words.chars.length + p.words.words.length === 0) return 'done'
      const items = [...(p.words?.chars ?? []), ...(p.words?.words ?? [])]
      return allMarked(items) ? 'done' : someMarked(items) ? 'doing' : 'todo'
    }
    case 'reading':
      return p.reading?.done ? 'done' : p.reading?.text ? 'doing' : 'todo'
    case 'writing':
      return p.writing?.done ? 'done' : p.writing?.imageId || p.writing?.scores ? 'doing' : 'todo'
  }
}

/** 生成报告至少需要完成课内认读和听写；拓展认读开放后也需要做完。其他部分可以不做。 */
export function canFinish(data: RunData): boolean {
  if (partStatus(data, 'recognition') !== 'done' || partStatus(data, 'dictation') !== 'done') return false
  const ext = partStatus(data, 'extension')
  return ext === 'locked' || ext === 'done'
}
