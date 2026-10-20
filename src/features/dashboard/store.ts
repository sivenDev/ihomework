import type { Dataset } from '../../data/types'
import { db } from '../../db/schema'
import { getSettings, updateSettings } from '../../db/settings'
import { localDate } from '../../lib/date'
import type { PracticeLevel } from '../assessment/logic/types'
import type { Advice } from '../daily/logic/advisor'
import { finishedReports, loadDailyState, practiceOverview } from '../daily/store'
import type { WritingData } from '../writing/logic/flow'
import { loadWritingStatus } from '../writing/store'
import { adviceSnoozed, bossStats, checkinStats, literacyCurve, nextAssessment, usageLastDays, type WeeklyRecord } from './logic/metrics'

/** 家长看板需要的全部数据。 */
export async function loadDashboard(ds: Dataset, today = localDate()) {
  const [state, reports, writing, writings, usage] = await Promise.all([
    loadDailyState(ds, today),
    finishedReports(),
    loadWritingStatus(),
    db.writings.toArray(),
    db.usage.toArray(),
  ])
  const overview = practiceOverview(state)
  const weekly: WeeklyRecord[] = state.exams
    .filter((e) => e.kind === 'weekly' && e.status === 'done')
    .map((e) => ({
      date: e.doneOn ?? e.date,
      progressLessonId: e.progressLessonId,
      // 计划 08 之前的周 Boss 没有分开记认读：用总结果代替
      read: e.readResults ?? e.results ?? {},
      write: e.writeResults ?? {},
    }))
  const scored = writings
    .map((w) => w.data as WritingData)
    .filter((d) => d.score)
    .sort((a, b) => b.score!.date.localeCompare(a.score!.date))
  return {
    today,
    state,
    overview,
    advice: overview.advice.filter((a) => !adviceSnoozed(state.settings.adviceDismissed[a.kind], today)),
    curve: literacyCurve({ books: ds.books, reports, weekly, extensionLearned: overview.extensionLearned, progress: state.progress }),
    writing: { ...writing, recent: scored.slice(0, 5) },
    boss: bossStats(state.history.cards),
    usage: usageLastDays(usage, today),
    checkin: checkinStats(state.days, today),
    lastAssessment: reports.at(-1)?.date,
    reassess: nextAssessment(reports.at(-1)?.date, today),
  }
}

export type Dashboard = Awaited<ReturnType<typeof loadDashboard>>

/** 采纳级别建议：改为建议的级别。 */
export async function adoptAdvice(to: PracticeLevel, today = localDate()) {
  await updateSettings({ practiceLevel: to, levelSince: today })
}

/** 忽略某类建议 7 天。 */
export async function dismissAdvice(kind: Advice['kind'], today = localDate()) {
  const s = await getSettings()
  await updateSettings({ adviceDismissed: { ...s.adviceDismissed, [kind]: today } })
}
