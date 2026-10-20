import { useLiveQuery } from 'dexie-react-hooks'
import { useSearchParams } from 'react-router-dom'
import { useSettings } from '../../app/useSettings'
import { localDate } from '../../lib/date'
import type { PracticeLevel } from '../assessment/logic/types'
import { effectiveLevel, levelConfig, type LevelConfig } from './logic/levels'
import type { TaskId } from './logic/planner'
import { finishedReports } from './store'

/** 最近一次评估建议的级别；没有评估时为 null。 */
export function useSuggestedLevel(): PracticeLevel | null | undefined {
  return useLiveQuery(async () => (await finishedReports()).at(-1)?.level ?? null)
}

/** 今天实际使用的练习级别和配额。 */
export function useTodayLevel(): { level: PracticeLevel; cfg: LevelConfig } | undefined {
  const settings = useSettings()
  const suggested = useSuggestedLevel()
  if (!settings || suggested === undefined) return undefined
  const level = effectiveLevel({ chosen: settings.practiceLevel, suggested: suggested ?? undefined, easyDay: settings.easyDay, today: localDate() })
  return { level, cfg: levelConfig(level, settings.levelTweaks[level]) }
}

/** 从今日任务进入时，网址里带着 ?task=… */
export function useTaskParam(): TaskId | null {
  const [params] = useSearchParams()
  return params.get('task') as TaskId | null
}
