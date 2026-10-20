// 级别建议与路线进度（PRD 4.5.3）：只给家长提示，不自动切换。纯函数。
import type { PracticeLevel } from '../../assessment/logic/types'
import { addDays } from '../../boss/logic/scheduler'
import { LEVEL_ORDER } from './levels'
import { weekStart } from './weekly'

export interface DayRecord {
  date: string
  /** 当天必做任务全部完成 */
  complete: boolean
}

export type Advice = { kind: 'down'; to: PracticeLevel } | { kind: 'up-or-fewer'; to?: PracticeLevel }

/** 连续几天没完成必做任务就建议降一级 */
export const MISSED_DAYS = 3
/** 周 Boss 正确率连续 2 周低于此值 → 建议升一级或减少新字 */
export const WEEKLY_LOW = 0.7

export function levelAdvice(opts: {
  level: PracticeLevel
  /** 当前级别从哪天开始用 */
  levelSince: string
  today: string
  days: DayRecord[]
  weeklyAccuracies: number[]
}): Advice[] {
  const advice: Advice[] = []
  const at = LEVEL_ORDER.indexOf(opts.level)
  const complete = new Set(opts.days.filter((d) => d.complete).map((d) => d.date))
  const recent = Array.from({ length: MISSED_DAYS }, (_, i) => addDays(opts.today, -(i + 1)))
  if (at > 0 && opts.levelSince <= recent[MISSED_DAYS - 1] && recent.every((d) => !complete.has(d)))
    advice.push({ kind: 'down', to: LEVEL_ORDER[at - 1] })

  const lastTwo = opts.weeklyAccuracies.slice(-2)
  if (lastTwo.length === 2 && lastTwo.every((a) => a < WEEKLY_LOW)) {
    const up = LEVEL_ORDER[at + 1]
    advice.push(up ? { kind: 'up-or-fewer', to: up } : { kind: 'up-or-fewer' })
  }
  return advice
}

/** 补漏进度：预计还需几周 = 剩余字数 ÷（每日新字配额 × 最近 2 周平均每周练习天数）。 */
export function backlogProgress(opts: { conquered: number; remaining: number; dailyNew: number; days: DayRecord[]; today: string }) {
  const from = addDays(opts.today, -14)
  const practiced = opts.days.filter((d) => d.complete && d.date >= from && d.date < opts.today).length
  const perWeek = (opts.dailyNew * practiced) / 2
  const weeks = opts.remaining === 0 ? 0 : perWeek > 0 ? Math.ceil(opts.remaining / perWeek) : null
  return { conquered: opts.conquered, remaining: opts.remaining, weeks }
}

/** 拓展进度：课外新学字数，以及本周、上周各学了多少。 */
export function extensionProgress(learned: { char: string; date: string }[], today: string) {
  const thisWeek = weekStart(today)
  const lastWeek = addDays(thisWeek, -7)
  const chars = (from: string, to: string) => new Set(learned.filter((l) => l.date >= from && l.date < to).map((l) => l.char)).size
  return {
    total: new Set(learned.map((l) => l.char)).size,
    thisWeek: chars(thisWeek, addDays(thisWeek, 7)),
    lastWeek: chars(lastWeek, thisWeek),
  }
}
