import { useLiveQuery } from 'dexie-react-hooks'
import type { Dataset } from '../../data/types'
import { db, type AssessmentRow } from '../../db/schema'
import { localDate } from '../../lib/date'
import { addMistakes } from '../boss/api'
import { newId } from '../../lib/id'
import { computeReport } from './logic/report'
import { sampleRecognition } from './logic/sampling'
import type { RunData } from './logic/types'

export interface Run extends AssessmentRow {
  id: number
  data: RunData
}

const RUN = 'run'

/** 正在进行（还没生成报告）的评估。 */
export function useActiveRun(): Run | null | undefined {
  return useLiveQuery(async () => {
    const runs = (await db.assessments.where('kind').equals(RUN).toArray()) as Run[]
    return runs.filter((r) => !r.data.report).at(-1) ?? null
  })
}

/** 已完成的评估，最新的在前。 */
export function useFinishedRuns(): Run[] | undefined {
  return useLiveQuery(async () => {
    const runs = (await db.assessments.where('kind').equals(RUN).toArray()) as Run[]
    return runs.filter((r) => r.data.report).reverse()
  })
}

export function useRun(id: number): Run | null | undefined {
  return useLiveQuery(async () => ((await db.assessments.get(id)) as Run | undefined) ?? null, [id])
}

export async function createRun(ds: Dataset, progressLessonId: string, sampleSize: number): Promise<number> {
  const data: RunData = {
    sampleSize,
    progressLessonId,
    parts: { recognition: { items: sampleRecognition(ds, { lessonId: progressLessonId }, sampleSize) } },
  }
  return (await db.assessments.add({ kind: RUN, date: localDate(), data })) as number
}

/** 修改评估数据并立即保存（每答一题保存一次，可以随时暂停）。 */
export async function updateRun(id: number, change: (data: RunData) => RunData) {
  await db.transaction('rw', db.assessments, async () => {
    const run = (await db.assessments.get(id)) as Run | undefined
    if (!run) return
    await db.assessments.put({ ...run, data: change(structuredClone(run.data)) })
  })
}

export async function discardRun(id: number) {
  await db.assessments.delete(id)
}

/** 生成报告并保存；出错的字进入错字 Boss。 */
export async function finishRun(ds: Dataset, id: number): Promise<void> {
  const run = (await db.assessments.get(id)) as Run | undefined
  if (!run) return
  const report = computeReport(ds, run.data, localDate())
  await db.assessments.put({ ...run, data: { ...run.data, report } })
  await addMistakes(report.backlog, 'assessment')
}

export async function saveImage(file: Blob): Promise<string> {
  const id = newId()
  await db.blobs.put({ id, blob: file, createdAt: Date.now() })
  return id
}
