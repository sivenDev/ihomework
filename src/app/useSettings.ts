import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, type AppSettings } from '../db/settings'

/** 设置变化时自动刷新；首次读取完成前返回 undefined。 */
export function useSettings(): AppSettings | undefined {
  return useLiveQuery(getSettings)
}
