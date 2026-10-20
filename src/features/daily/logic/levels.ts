// 三个练习级别（PRD 4.5.3）：级别决定每天练多少。纯函数，日期格式 YYYY-MM-DD。
import type { PracticeLevel } from '../../assessment/logic/types'

export const LEVEL_ORDER: PracticeLevel[] = ['轻松', '标准', '加强']

export interface LevelConfig {
  /** 孩子看到的名称 */
  kidName: string
  /** 每天分几段 */
  segments: 1 | 2
  /** 每段时长（分钟） */
  segmentMinutes: number
  /** 每天新字数 */
  newChars: number
  /** 每天错字 Boss 上限 */
  bossCap: number
  /** 周末额外的特训闯关（分钟），0 表示没有 */
  weekendBonusMinutes: number
}

export const LEVELS: Record<PracticeLevel, LevelConfig> = {
  轻松: { kidName: '日常巡逻', segments: 1, segmentMinutes: 15, newChars: 0, bossCap: 10, weekendBonusMinutes: 0 },
  标准: { kidName: '侦探训练', segments: 1, segmentMinutes: 20, newChars: 3, bossCap: 15, weekendBonusMinutes: 0 },
  加强: { kidName: '特训营', segments: 2, segmentMinutes: 15, newChars: 8, bossCap: 25, weekendBonusMinutes: 15 },
}

/** 两段之间的休息（分钟） */
export const REST_MINUTES = 5

/** 家长可以在级别内微调的项目和范围 */
export type LevelTweak = Partial<Pick<LevelConfig, 'newChars' | 'bossCap' | 'segmentMinutes'>>
export const TWEAK_LIMITS = {
  newChars: { min: 0, max: 15 },
  bossCap: { min: 5, max: 40 },
} as const
export const SEGMENT_MINUTE_OPTIONS = [10, 15, 20, 25, 30] as const

export function levelConfig(level: PracticeLevel, tweak: LevelTweak = {}): LevelConfig {
  const clamp = (n: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, n))
  const base = LEVELS[level]
  return {
    ...base,
    newChars: clamp(tweak.newChars ?? base.newChars, TWEAK_LIMITS.newChars),
    bossCap: clamp(tweak.bossCap ?? base.bossCap, TWEAK_LIMITS.bossCap),
    segmentMinutes: tweak.segmentMinutes ?? base.segmentMinutes,
  }
}

/**
 * 今天实际使用的级别：家长临时切到“轻松”只在当天有效；家长还没选时用评估建议，没有评估时用“标准”。
 */
export function effectiveLevel(opts: {
  chosen: PracticeLevel | null
  suggested?: PracticeLevel
  easyDay: string | null
  today: string
}): PracticeLevel {
  if (opts.easyDay === opts.today) return '轻松'
  return opts.chosen ?? opts.suggested ?? '标准'
}

/** 0 = 周日 … 6 = 周六 */
export function weekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function isWeekend(date: string): boolean {
  const w = weekday(date)
  return w === 0 || w === 6
}
