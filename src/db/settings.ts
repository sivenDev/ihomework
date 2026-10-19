import { db } from './schema'

export interface AppSettings {
  pinHash: string | null
  pinSalt: string | null
  /** 每段使用时长上限（分钟）。计划 06 改为随练习级别变化。 */
  sessionLimitMinutes: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  pinHash: null,
  pinSalt: null,
  sessionLimitMinutes: 20,
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
