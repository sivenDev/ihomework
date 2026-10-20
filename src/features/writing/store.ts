import { useLiveQuery } from 'dexie-react-hooks'
import type { Dataset } from '../../data/types'
import { db } from '../../db/schema'
import { getSettings, updateSettings } from '../../db/settings'
import { localDate } from '../../lib/date'
import type { RubricScores } from '../assessment/logic/types'
import { loadDailyState, finishedReports } from '../daily/store'
import { writingLevelXpEvent } from '../rewards/logic/xp'
import { awardXp } from '../rewards/store'
import { newWriting, rubricTotal, type WritingData } from './logic/flow'
import { challengeGoal, currentWritingLevel, levelStatus, nextWritingLevel, type GoalResult, type WritingLevel } from './logic/levels'

export interface Writing {
  id: number
  date: string
  data: WritingData
}

async function allWritings(): Promise<Writing[]> {
  return (await db.writings.orderBy('id').toArray()) as Writing[]
}

/** 当前写作等级：家长确认过的等级 → 评估结果 → 1 级。 */
export async function getWritingLevel(): Promise<WritingLevel> {
  const [settings, reports] = await Promise.all([getSettings(), finishedReports()])
  const assessed = reports.filter((r) => r.writing).at(-1)?.writing?.level
  return currentWritingLevel(settings.writingLevel, assessed)
}

/** 等级和当前等级的达标次数 */
export async function loadWritingStatus() {
  const [level, writings] = await Promise.all([getWritingLevel(), allWritings()])
  const scored = writings.filter((w) => w.data.score).map((w) => ({ level: w.data.level, result: w.data.score!.result }))
  return { level, ...levelStatus(scored, level) }
}

export function useWritingStatus() {
  return useLiveQuery(loadWritingStatus)
}

export function useWritings(): Writing[] | undefined {
  return useLiveQuery(async () => (await allWritings()).reverse())
}

export function useWriting(id: number): Writing | null | undefined {
  return useLiveQuery(async () => ((await db.writings.get(id)) as Writing | undefined) ?? null, [id])
}

/** 还没写完的那篇（同一时间只有一篇草稿）。 */
export function useDraft(): Writing | null | undefined {
  return useLiveQuery(async () => (await allWritings()).filter((w) => w.data.status === 'draft').at(-1) ?? null)
}

/** 开始一篇新的看图写作：按当前等级定目标，拓展路线提高一级作为挑战。 */
export async function startWriting(ds: Dataset, today = localDate()): Promise<number> {
  const existing = (await allWritings()).find((w) => w.data.status === 'draft')
  if (existing) return existing.id
  const [level, state] = await Promise.all([getWritingLevel(), loadDailyState(ds, today)])
  return (await db.writings.add({ date: today, data: newWriting(level, challengeGoal(level, state.route)) })) as number
}

/** 修改并立即保存（每一步都保存，中途退出后可以继续）。 */
export async function updateWriting(id: number, change: (data: WritingData) => WritingData) {
  await db.transaction('rw', db.writings, async () => {
    const row = (await db.writings.get(id)) as Writing | undefined
    if (!row) return
    await db.writings.put({ ...row, data: change(structuredClone(row.data)) })
  })
}

export async function submitWriting(id: number, today = localDate()) {
  await updateWriting(id, (d) => ({ ...d, status: 'submitted', submittedOn: today }))
}

export async function discardWriting(id: number) {
  const row = (await db.writings.get(id)) as Writing | undefined
  if (!row) return
  await db.transaction('rw', db.writings, db.blobs, async () => {
    await db.blobs.bulkDelete([...row.data.imageIds, ...(row.data.report.photoId ? [row.data.report.photoId] : [])])
    await db.writings.delete(id)
  })
}

/** 家长评分：5 项评分表 + 是否达到本次目标，记入写作历史。 */
export async function scoreWriting(id: number, scores: RubricScores, result: GoalResult, today = localDate()) {
  await updateWriting(id, (d) => ({ ...d, status: 'scored', score: { scores, total: rubricTotal(scores), result, date: today } }))
}

/** 当前等级达标 2 次后，家长确认升一级，发经验值。 */
export async function levelUpWriting(): Promise<WritingLevel | null> {
  const status = await loadWritingStatus()
  if (!status.canLevelUp) return null
  const next = nextWritingLevel(status.level)
  await updateSettings({ writingLevel: next })
  await awardXp([writingLevelXpEvent(next, Date.now())])
  return next
}
