import type { PracticeLevel, Route } from '../features/assessment/logic/types'
import type { LevelTweak } from '../features/daily/logic/levels'
import { db } from './schema'

export interface AppSettings {
  pinHash: string | null
  pinSalt: string | null
  /** 当前学到的课（计划 02） */
  progressLessonId: string | null
  /** 是否允许超前学习后续课程（拓展路线） */
  allowAhead: boolean
  /** 家长选定的练习级别；null 表示还没确认（先用评估建议）（计划 06） */
  practiceLevel: PracticeLevel | null
  /** 当前级别从哪天开始用，用于级别建议 */
  levelSince: string | null
  /** 家长在级别内的微调（新字数、Boss 上限、每段时长） */
  levelTweaks: Partial<Record<PracticeLevel, LevelTweak>>
  /** 家长锁定的学习路线；null 表示自动 */
  routeLock: Route | null
  /** 临时切到“轻松”的那一天 */
  easyDay: string | null
  /** 拓展字是否要求书写（默认只认读） */
  extensionWriting: boolean
  /** 最近一次路线自动切换，给家长看 */
  routeNotice: { from: Route; to: Route; date: string } | null
  /** 孩子已经看过庆祝动画的等级 */
  lastSeenRank: number | null
  /** 上次生成任务时的课本进度，用于发现“进入新单元” */
  lastProgressLessonId: string | null
}

export const DEFAULT_SETTINGS: AppSettings = {
  pinHash: null,
  pinSalt: null,
  progressLessonId: null,
  allowAhead: false,
  practiceLevel: null,
  levelSince: null,
  levelTweaks: {},
  routeLock: null,
  easyDay: null,
  extensionWriting: false,
  routeNotice: null,
  lastSeenRank: null,
  lastProgressLessonId: null,
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.settings.toArray()
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return { ...DEFAULT_SETTINGS, ...stored } as AppSettings
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  await db.settings.bulkPut(Object.entries(patch).map(([key, value]) => ({ key, value })))
}
