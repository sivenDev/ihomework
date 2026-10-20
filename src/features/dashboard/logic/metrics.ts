// 家长看板的指标（PRD 4.9）：识字量曲线、错字 Boss、打卡与用时、复评提醒。纯函数。
import type { Book } from '../../../data/types'
import type { Report } from '../../assessment/logic/types'
import { addDays, type BossCard } from '../../boss/logic/scheduler'
import { streakDays } from '../../rewards/logic/xp'
import { learnedShizi, learnedXiezi, type Progress } from '../../textbook/logic/scope'

/** 每 4 周复评一次 */
export const REASSESS_DAYS = 28

export interface WeeklyRecord {
  date: string
  /** 出题时的课本进度；没有记录时用当前进度 */
  progressLessonId?: string
  /** 每个字是否读对 */
  read: Record<string, boolean>
  /** 要默写的字是否写对 */
  write: Record<string, boolean>
}

export const CURVE_SERIES = [
  { key: 'recognition', label: '课内认读' },
  { key: 'writing', label: '课内会写' },
  { key: 'extension', label: '课外识字' },
] as const

export interface CurvePoint {
  date: string
  source: 'assessment' | 'weekly'
  /** 课内认读字数（估算） */
  recognition: number
  /** 课内会写字数（估算）；还没有书写数据时为 null */
  writing: number | null
  /** 课外识字数 */
  extension: number
}

const ratio = (r: Record<string, boolean>) => {
  const v = Object.values(r)
  return v.length ? v.filter(Boolean).length / v.length : null
}

/**
 * 识字量曲线：
 * - 评估：课内认读用报告的估算；会写 = 听写正确率 × 已学写字表字数；课外用拓展认读的估算。
 * - 周 Boss：课内认读 = 认读正确率 × 已学生字数；会写 = 默写正确率 × 已学写字表字数；
 *   课外 = 最近一次课外估算 + 之后新字任务中学过的课外字。
 * 某项没有新数据时沿用上一次的值。
 */
export function literacyCurve(input: {
  books: Book[]
  reports: Report[]
  weekly: WeeklyRecord[]
  extensionLearned: { char: string; date: string }[]
  progress: Progress
}): CurvePoint[] {
  type Event = { date: string; order: number; report?: Report; weekly?: WeeklyRecord }
  const events: Event[] = [
    ...input.reports.map((report) => ({ date: report.date, order: 0, report })),
    ...input.weekly.map((weekly) => ({ date: weekly.date, order: 1, weekly })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order)

  let writing: number | null = null
  let extensionBase = 0
  let baseDate = ''
  const extensionSince = (date: string) =>
    new Set(input.extensionLearned.filter((l) => l.date > baseDate && l.date <= date).map((l) => l.char)).size

  return events.map(({ date, report, weekly }): CurvePoint => {
    if (report) {
      const progress = { lessonId: report.progressLessonId }
      if (report.dictation) writing = Math.round(report.dictation.accuracy * learnedXiezi(input.books, progress).length)
      if (report.extension) {
        extensionBase = report.extension.estimate
        baseDate = date
      } else {
        extensionBase += extensionSince(date)
        baseDate = date
      }
      return { date, source: 'assessment', recognition: report.recognition.estimate, writing, extension: extensionBase }
    }
    const w = weekly!
    const progress = w.progressLessonId ? { lessonId: w.progressLessonId } : input.progress
    const readAcc = ratio(w.read) ?? 0
    const writeAcc = ratio(w.write)
    if (writeAcc !== null) writing = Math.round(writeAcc * learnedXiezi(input.books, progress).length)
    return {
      date,
      source: 'weekly',
      recognition: Math.round(readAcc * learnedShizi(input.books, progress).length),
      writing,
      extension: extensionBase + extensionSince(date),
    }
  })
}

/** 错字 Boss：还没打败的字（先到期的在前）和击败率。 */
export function bossStats(cards: BossCard[]) {
  const active = cards.filter((c) => c.status === 'active').sort((a, b) => a.due.localeCompare(b.due) || a.char.localeCompare(b.char))
  const defeated = cards.length - active.length
  return { active: active.map((c) => c.char), defeated, total: cards.length, rate: cards.length ? defeated / cards.length : null }
}

/** 近 7 天每天的使用分钟数（含今天，按日期从早到晚）。 */
export function usageLastDays(rows: { date: string; seconds: number }[], today: string, days = 7) {
  const byDate = new Map(rows.map((r) => [r.date, r.seconds]))
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - days + 1)
    return { date, minutes: Math.round((byDate.get(date) ?? 0) / 60) }
  })
}

/** 打卡：连续天数和累计完成天数。 */
export function checkinStats(days: { date: string; complete: boolean }[], today: string) {
  return { streak: streakDays(days, today), total: days.filter((d) => d.complete).length }
}

/** 复评提醒：上次评估 4 周后到期。没有评估时返回 null。 */
export function nextAssessment(lastDate: string | undefined, today: string) {
  if (!lastDate) return null
  const due = addDays(lastDate, REASSESS_DAYS)
  const daysLeft = Math.round((Date.parse(due) - Date.parse(today)) / 86_400_000)
  return { due, daysLeft }
}

/** 家长点了“忽略”的建议，7 天内不再显示。 */
export const ADVICE_SNOOZE_DAYS = 7

export function adviceSnoozed(dismissedOn: string | undefined, today: string): boolean {
  return !!dismissedOn && today < addDays(dismissedOn, ADVICE_SNOOZE_DAYS)
}
