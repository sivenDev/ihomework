import { useMemo } from 'react'
import { useSettings } from '../../app/useSettings'
import type { Dataset } from '../../data/types'
import { learnedShizi, type Progress } from '../textbook/logic/scope'
import { useDataset } from '../textbook/useDataset'

export interface ChallengeContext {
  ds: Dataset
  progress: Progress
  learned: Set<string>
}

/** 闯关页面共用：字库、课本进度、已学的字。 */
export function useChallenge(): ChallengeContext | undefined {
  const ds = useDataset()
  const settings = useSettings()
  return useMemo(() => {
    if (!ds || !settings) return undefined
    const progress: Progress = settings.progressLessonId ? { lessonId: settings.progressLessonId } : null
    return { ds, progress, learned: new Set(learnedShizi(ds.books, progress)) }
  }, [ds, settings])
}
