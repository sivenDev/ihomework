import { db } from './schema'

export interface AppSettings {
  pinHash: string | null
  pinSalt: string | null
  /** 每段使用时长上限（分钟）。计划 06 改为随练习级别变化。 */
  sessionLimitMinutes: number
  /** 当前学到的课（计划 02） */
  progressLessonId: string | null
  /** 是否允许超前学习后续课程（拓展路线） */
  allowAhead: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  pinHash: null,
  pinSalt: null,
  sessionLimitMinutes: 20,
  progressLessonId: null,
  allowAhead: false,
}

export const SESSION_LIMIT_OPTIONS = [10, 15, 20, 25, 30] as const

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.settings.toArray()
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return { ...DEFAULT_SETTINGS, ...stored } as AppSettings
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  await db.settings.bulkPut(Object.entries(patch).map(([key, value]) => ({ key, value })))
}
