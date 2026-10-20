// 经验值（PRD 4.8）：只加不扣。事件带唯一 id，同一事件只记一次。纯函数。
import { addDays } from '../../boss/logic/scheduler'

export const XP_RULES = {
  /** 攻克 1 个字 */
  defeat: 1,
  /** 写作升一级（计划 07） */
  writingLevel: 5,
  /** 读完 1 本书（计划 07） */
  bookFinished: 20,
  /** 完成每日任务的一段（加强级别两段共 +20） */
  dailySegment: 10,
} as const

export interface XpEvent {
  id: string
  kind: keyof typeof XP_RULES
  amount: number
  ts: number
}

export type RedemptionStatus = 'pending' | 'confirmed' | 'declined'

export function dailyXpEvents(date: string, segments: (1 | 2)[], ts: number): XpEvent[] {
  return segments.map((s) => ({ id: `daily:${date}:${s}`, kind: 'dailySegment', amount: XP_RULES.dailySegment, ts }))
}

export function defeatXpEvent(char: string, ts: number): XpEvent {
  return { id: `defeat:${char}`, kind: 'defeat', amount: XP_RULES.defeat, ts }
}

/** 去掉已经记过的事件（包括同一批里重复的）。 */
export function freshEvents(existingIds: Iterable<string>, events: XpEvent[]): XpEvent[] {
  const seen = new Set(existingIds)
  return events.filter((e) => !seen.has(e.id) && !!seen.add(e.id))
}

/**
 * 累计经验值决定等级，永远不减少；可用经验值 = 累计 − 已兑换 − 等待家长确认的。
 */
export function xpSummary(events: { amount: number }[], redemptions: { cost: number; status: RedemptionStatus }[]) {
  const total = events.reduce((n, e) => n + e.amount, 0)
  const sum = (status: RedemptionStatus) => redemptions.filter((r) => r.status === status).reduce((n, r) => n + r.cost, 0)
  const spent = sum('confirmed')
  const reserved = sum('pending')
  return { total, spent, reserved, available: total - spent - reserved }
}

/** 连续打卡天数：到今天（今天还没完成时到昨天）为止，连续完成必做任务的天数。 */
export function streakDays(days: { date: string; complete: boolean }[], today: string): number {
  const complete = new Set(days.filter((d) => d.complete).map((d) => d.date))
  let day = complete.has(today) ? today : addDays(today, -1)
  let n = 0
  while (complete.has(day)) {
    n++
    day = addDays(day, -1)
  }
  return n
}
