// 新字任务取字（PRD 4.5.1、4.5.2）：按路线和配额取字。纯函数。
import type { Dataset } from '../../../data/types'
import type { AttemptResult } from '../../../db/schema'
import type { Route } from '../../assessment/logic/types'
import type { BossCard } from '../../boss/logic/scheduler'
import { extensionCandidates } from '../../textbook/logic/extension'
import { currentLesson, learnedShizi, lessonsInOrder, nextLesson, type Progress } from '../../textbook/logic/scope'

export type NewCharSource = 'backlog' | 'sync' | 'extension'
export const NEW_CHAR_SOURCES: NewCharSource[] = ['backlog', 'sync', 'extension']

export interface NewCharPick {
  char: string
  source: NewCharSource
}

export interface CharHistory {
  cards: BossCard[]
  /** 闯关作答记录（错字 Boss 的作答不在其中） */
  attempts: { char: string; result: AttemptResult; ts: number }[]
  /** 最近一次评估的待攻克清单 */
  reportBacklog: string[]
}

/** 通过新字任务学过（错字卡来源含 backlog / sync / extension） */
function taughtSet(cards: BossCard[]): Set<string> {
  return new Set(cards.filter((c) => c.sources.some((s) => (NEW_CHAR_SOURCES as string[]).includes(s))).map((c) => c.char))
}

/** 最近一次作答是对的字：已经认识，不再当新字教 */
function knownSet(attempts: CharHistory['attempts']): Set<string> {
  const latest = new Map<string, { result: AttemptResult; ts: number }>()
  for (const a of attempts) {
    const prev = latest.get(a.char)
    if (!prev || a.ts >= prev.ts) latest.set(a.char, a)
  }
  return new Set([...latest].filter(([, a]) => a.result === 'correct').map(([c]) => c))
}

function textbookOrder(ds: Dataset): Map<string, number> {
  const order = new Map<string, number>()
  for (const l of lessonsInOrder(ds.books)) for (const r of l.shizi) if (!order.has(r.char)) order.set(r.char, order.size)
  return order
}

/**
 * 补漏清单：评估的待攻克字 + 当前课之前学过、有作答记录但从未答对的字，按课本顺序先早后晚。
 * 错字卡被打败（含复查中、彻底记住）算“已攻克”。
 */
export function backlogList(ds: Dataset, progress: Progress, history: CharHistory): { all: string[]; conquered: string[]; remaining: string[] } {
  const current = new Set(currentLesson(ds.books, progress)?.shizi.map((r) => r.char) ?? [])
  const before = learnedShizi(ds.books, progress).filter((c) => !current.has(c))
  const tried = new Set(history.attempts.map((a) => a.char))
  const everCorrect = new Set(history.attempts.filter((a) => a.result === 'correct').map((a) => a.char))
  const neverCorrect = before.filter((c) => tried.has(c) && !everCorrect.has(c))

  const order = textbookOrder(ds)
  const rank = (c: string) => order.get(c) ?? Number.MAX_SAFE_INTEGER
  const all = [...new Set([...history.reportBacklog, ...neverCorrect])].sort((a, b) => rank(a) - rank(b))
  const defeated = new Set(history.cards.filter((c) => c.status === 'defeated').map((c) => c.char))
  return { all, conquered: all.filter((c) => defeated.has(c)), remaining: all.filter((c) => !defeated.has(c)) }
}

function syncCandidates(ds: Dataset, progress: Progress, history: CharHistory): string[] {
  const inBoss = new Set(history.cards.map((c) => c.char))
  const known = knownSet(history.attempts)
  const lessons = [currentLesson(ds.books, progress), nextLesson(ds.books, progress)]
  return [...new Set(lessons.flatMap((l) => l?.shizi.map((r) => r.char) ?? []))].filter((c) => !inBoss.has(c) && !known.has(c))
}

/** 拓展字：① 超前课程 → ② 字族课外字 → ③ 常用字，三类轮流取，保证新鲜感。 */
function extensionRotation(ds: Dataset, progress: Progress, history: CharHistory, allowAhead: boolean): string[] {
  const skip = new Set([...history.cards.map((c) => c.char), ...knownSet(history.attempts)])
  const { ahead, family, frequent } = extensionCandidates(ds, progress, { allowAhead, mastered: skip })
  const lists = [ahead, family, frequent]
  const cursors = [0, 0, 0]
  const out: string[] = []
  const used = new Set<string>()
  for (let progressed = true; progressed; ) {
    progressed = false
    lists.forEach((list, i) => {
      while (cursors[i] < list.length && used.has(list[cursors[i]])) cursors[i]++
      if (cursors[i] < list.length) {
        used.add(list[cursors[i]])
        out.push(list[cursors[i]++])
        progressed = true
      }
    })
  }
  return out
}

/** 按路线取 count 个新字。补漏或拓展的字不够时，用本课和下一课的字补足。 */
export function pickNewChars(
  ds: Dataset,
  progress: Progress,
  route: Route,
  count: number,
  history: CharHistory,
  opts: { allowAhead: boolean },
): NewCharPick[] {
  if (count <= 0) return []
  const picks: NewCharPick[] = []
  const add = (chars: string[], source: NewCharSource) => {
    for (const char of chars) {
      if (picks.length >= count) return
      if (!picks.some((p) => p.char === char)) picks.push({ char, source })
    }
  }
  if (route === '补漏') {
    const taught = taughtSet(history.cards)
    add(backlogList(ds, progress, history).remaining.filter((c) => !taught.has(c)), 'backlog')
  } else if (route === '拓展') {
    add(extensionRotation(ds, progress, history, opts.allowAhead), 'extension')
  }
  add(syncCandidates(ds, progress, history), 'sync')
  return picks
}
