import { useLiveQuery } from 'dexie-react-hooks'
import type { Dataset, Lesson } from '../../data/types'
import { db, type DailyPlanRow, type ExamRow } from '../../db/schema'
import { getSettings, updateSettings, type AppSettings } from '../../db/settings'
import { localDate } from '../../lib/date'
import { sample } from '../assessment/logic/sampling'
import type { PracticeLevel, Report, Route, RunData } from '../assessment/logic/types'
import { dueCards, enroll } from '../boss/logic/scheduler'
import { dailyXpEvents } from '../rewards/logic/xp'
import { awardXp } from '../rewards/store'
import { learnedLessons, nextLesson, type Progress } from '../textbook/logic/scope'
import { backlogProgress, extensionProgress, levelAdvice, type DayRecord } from './logic/advisor'
import { effectiveLevel, isWeekend, levelConfig, REST_MINUTES, type LevelConfig } from './logic/levels'
import { backlogList, pickNewChars, type CharHistory, type NewCharPick } from './logic/newChars'
import { dayComplete, overload, planTasks, requiredSegments, segmentDone, type TaskId } from './logic/planner'
import { decideRoute } from './logic/routes'
import { unitEnded, unitKey, weeklyBossOpen, weeklyPool, weekStart, WEEKLY_SIZE } from './logic/weekly'

/** 侦察任务一次预习几个字 */
const PREVIEW_MAX = 6

export interface DailyState {
  today: string
  settings: AppSettings
  progress: Progress
  /** 最近一次评估建议的级别 */
  suggested?: PracticeLevel
  level: PracticeLevel
  cfg: LevelConfig
  /** 按规则自动判断的路线（不考虑锁定） */
  autoRoute: Route
  route: Route
  backlog: { all: string[]; conquered: string[]; remaining: string[] }
  history: CharHistory
  weeklyAccuracies: number[]
  days: DayRecord[]
  plans: DailyPlanRow[]
  exams: ExamRow[]
}

export async function finishedReports(): Promise<Report[]> {
  const runs = await db.assessments.where('kind').equals('run').sortBy('id')
  return runs.map((r) => (r.data as RunData).report).filter((r): r is Report => !!r)
}

/** 读取生成任务和家长看板需要的全部数据。 */
export async function loadDailyState(ds: Dataset, today = localDate()): Promise<DailyState> {
  const [settings, cards, attempts, reports, plans, exams] = await Promise.all([
    getSettings(),
    db.bossCards.toArray(),
    db.attempts.toArray(),
    finishedReports(),
    db.dailyPlans.orderBy('date').toArray(),
    db.exams.toArray(),
  ])
  const progress: Progress = settings.progressLessonId ? { lessonId: settings.progressLessonId } : null
  const latest = reports.at(-1)
  const first = reports[0]
  const level = effectiveLevel({ chosen: settings.practiceLevel, suggested: latest?.level, easyDay: settings.easyDay, today })
  const history: CharHistory = { cards, attempts, reportBacklog: latest?.backlog ?? [] }
  const backlog = backlogList(ds, progress, history)
  const weeklyAccuracies = exams
    .filter((e) => e.kind === 'weekly' && e.status === 'done')
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((e) => e.accuracy ?? 0)
  const autoRoute = decideRoute({
    lock: null,
    backlogRemaining: backlog.remaining.length,
    weeklyAccuracies,
    firstAssessment: first && { recognition: first.recognition.accuracy, dictation: first.dictation?.accuracy },
  })
  return {
    today,
    settings,
    progress,
    suggested: latest?.level,
    level,
    cfg: levelConfig(level, settings.levelTweaks[level]),
    autoRoute,
    route: settings.routeLock ?? autoRoute,
    backlog,
    history,
    weeklyAccuracies,
    days: plans.map((p) => ({ date: p.date, complete: p.complete })),
    plans,
    exams,
  }
}

/**
 * 家长看的级别与路线概况：家长选定的级别（没选时为评估建议或“标准”）及其配额、级别建议、
 * 补漏进度、拓展进度、最近的周 Boss。练习级别页和家长看板共用。
 */
export function practiceOverview(state: DailyState) {
  const { settings, today } = state
  const base: PracticeLevel = settings.practiceLevel ?? state.suggested ?? '标准'
  const cfg = levelConfig(base, settings.levelTweaks[base])
  const advice = levelAdvice({
    level: base,
    levelSince: settings.levelSince ?? state.plans[0]?.date ?? today,
    today,
    days: state.days,
    weeklyAccuracies: state.weeklyAccuracies,
  })
  const extensionLearned = state.plans.flatMap((p) =>
    p.done.newChars ? (p.tasks.find((t) => t.id === 'newChars')?.picks ?? []).filter((x) => x.source === 'extension').map((x) => ({ char: x.char, date: p.date })) : [],
  )
  const backlog = backlogProgress({
    conquered: state.backlog.conquered.length,
    remaining: state.backlog.remaining.length,
    dailyNew: cfg.newChars,
    days: state.days,
    today,
  })
  const weekly = state.exams.filter((e) => e.kind === 'weekly' && e.status === 'done').sort((a, b) => b.key.localeCompare(a.key))
  return { base, cfg, advice, backlog, extensionLearned, extension: extensionProgress(extensionLearned, today), weekly }
}

/** 任务清单的格式版本：升级后当天的清单重新生成（计划 07 开放了阅读打卡） */
const PLAN_VERSION = 2

/** 生成任务时依据的设置：变化时当天的任务重新生成。 */
function planKey(state: DailyState): string {
  const { settings, level, cfg } = state
  return JSON.stringify([PLAN_VERSION, level, cfg, settings.routeLock, settings.progressLessonId, settings.allowAhead])
}

/** 当天复习用的课：当前课；当前课没有生字（拼音课）时往前找最近一课。 */
function reviewLesson(ds: Dataset, progress: Progress): Lesson | undefined {
  return learnedLessons(ds.books, progress)
    .filter((l) => l.shizi.length)
    .at(-1)
}

function buildTasks(ds: Dataset, state: DailyState) {
  const { cfg, progress, today } = state
  const { newChars, bossToday } = overload(cfg, dueCards(state.history.cards, today).length)
  return planTasks({
    cfg,
    weekend: isWeekend(today),
    previewChars: (nextLesson(ds.books, progress)?.shizi ?? []).slice(0, PREVIEW_MAX).map((r) => r.char),
    reviewChars: reviewLesson(ds, progress)?.shizi.map((r) => r.char) ?? [],
    newPicks: pickNewChars(ds, progress, state.route, newChars, state.history, { allowAhead: state.settings.allowAhead }),
    bossToday,
  })
}

function findExam(kind: ExamRow['kind'], key: string): Promise<ExamRow | undefined> {
  return db.exams.where('key').equals(key).filter((e) => e.kind === kind).first()
}

/** 家长把进度推进到新单元时，为刚结束的单元生成一次单元挑战。 */
async function checkUnitChallenge(ds: Dataset, settings: AppSettings, today: string) {
  if (settings.progressLessonId === settings.lastProgressLessonId || !settings.progressLessonId) return
  const ended = unitEnded(ds.books, settings.lastProgressLessonId, settings.progressLessonId)
  await updateSettings({ lastProgressLessonId: settings.progressLessonId })
  if (!ended) return
  const key = unitKey(ended[0])
  if (await findExam('unit', key)) return
  const chars = sample([...new Set(ended.flatMap((l) => l.shizi.map((r) => r.char)))], WEEKLY_SIZE)
  const xiezi = new Set(ended.flatMap((l) => l.xiezi))
  const book = ds.books.find((b) => b.id === ended[0].book)
  await db.exams.add({
    kind: 'unit',
    key,
    title: `${book?.name ?? ''}第 ${ended[0].unit} 单元`,
    date: today,
    chars,
    write: chars.filter((c) => xiezi.has(c)),
    status: 'pending',
    progressLessonId: ended.at(-1)!.id,
  })
}

/** 生成（或在设置变化后重新生成）今天的任务清单。已完成的任务保留；新字任务做完后不再换字。 */
export async function ensureTodayPlan(ds: Dataset, today = localDate()): Promise<void> {
  const state = await loadDailyState(ds, today)
  if (!state.progress) return
  await checkUnitChallenge(ds, state.settings, today)
  const key = planKey(state)
  const existing = state.plans.find((p) => p.date === today)
  if (existing?.key === key) return

  const tasks = buildTasks(ds, state)
  const done: DailyPlanRow['done'] = {}
  // 任务清单生成之前就打过卡的阅读也算完成
  if (await db.readingLogs.where('date').equals(today).count()) done.reading = true
  for (const t of tasks) {
    const old = existing?.tasks.find((o) => o.id === t.id)
    if (old && existing?.done[t.id]) {
      done[t.id] = true
      if (t.id === 'newChars') t.picks = old.picks
    }
  }
  await db.dailyPlans.put({
    date: today,
    key,
    level: state.level,
    route: state.route,
    tasks,
    done,
    segment: existing?.segment ?? 1,
    restUntil: existing?.restUntil,
    complete: dayComplete(tasks, done),
    createdAt: existing?.createdAt ?? Date.now(),
  })

  // 自动切换路线时提示家长（家长锁定时不提示）
  const previous = state.plans.filter((p) => p.date < today).at(-1)
  if (!existing && !state.settings.routeLock && previous && previous.route !== state.route)
    await updateSettings({ routeNotice: { from: previous.route, to: state.route, date: today } })
  await settleXp(today)
}

/** 完成的段发经验值：每段 +10（同一天同一段只发一次）。 */
async function settleXp(today: string) {
  const plan = await db.dailyPlans.get(today)
  if (!plan) return
  const segments = requiredSegments(plan.tasks).filter((s) => segmentDone(plan.tasks, plan.done, s))
  await awardXp(dailyXpEvents(today, segments, Date.now()))
}

/** 记下完成的任务。加强级别第一段做完后开始 5 分钟休息。 */
export async function completeTask(taskId: TaskId, today = localDate()): Promise<void> {
  await db.transaction('rw', db.dailyPlans, async () => {
    const plan = await db.dailyPlans.get(today)
    if (!plan || plan.done[taskId] || !plan.tasks.some((t) => t.id === taskId)) return
    const done = { ...plan.done, [taskId]: true }
    const restUntil =
      plan.segment === 1 && !plan.restUntil && requiredSegments(plan.tasks).includes(2) && segmentDone(plan.tasks, done, 1)
        ? Date.now() + REST_MINUTES * 60_000
        : plan.restUntil
    await db.dailyPlans.put({ ...plan, done, restUntil, complete: dayComplete(plan.tasks, done) })
  })
  await settleXp(today)
}

/** 第一段时间到了：开始两段之间的休息。 */
export async function startSegmentRest(today = localDate()): Promise<void> {
  await db.transaction('rw', db.dailyPlans, async () => {
    const plan = await db.dailyPlans.get(today)
    if (!plan || plan.segment !== 1 || plan.restUntil) return
    await db.dailyPlans.put({ ...plan, restUntil: Date.now() + REST_MINUTES * 60_000 })
  })
}

export async function beginSegmentTwo(today = localDate()): Promise<void> {
  await db.dailyPlans.update(today, { segment: 2 })
}

export function useTodayPlan(today = localDate()): DailyPlanRow | null | undefined {
  return useLiveQuery(async () => (await db.dailyPlans.get(today)) ?? null, [today])
}

/** 新字任务学完：以 backlog / sync / extension 为来源进入错字 Boss。 */
export async function enrollNewChars(picks: NewCharPick[], today = localDate()): Promise<void> {
  await db.transaction('rw', db.bossCards, async () => {
    for (const p of picks) await db.bossCards.put(enroll(await db.bossCards.get(p.char), p.char, p.source, today))
  })
}

/** 是否要求会写：课本写字表中的字要写；拓展字按家长设置（默认只认读）。 */
export function needsWriting(ds: Dataset, xiezi: Set<string>, char: string, sources: string[], extensionWriting: boolean): boolean {
  const extension = sources.includes('extension') || !ds.books.some((b) => b.lessons.some((l) => l.shizi.some((r) => r.char === char)))
  return extension ? extensionWriting : xiezi.has(char)
}

export function allXiezi(ds: Dataset): Set<string> {
  return new Set(ds.books.flatMap((b) => b.lessons.flatMap((l) => l.xiezi)))
}

/** 周六起：从本周学过、练过的字里抽 20 个，生成本周的周 Boss（每周一次）。返回 id；没有可抽的字时返回 null。 */
export async function ensureWeeklyExam(ds: Dataset, today = localDate()): Promise<number | null> {
  if (!weeklyBossOpen(today)) return null
  const key = weekStart(today)
  const existing = await findExam('weekly', key)
  if (existing) return existing.id!
  const [plans, attempts, cards, settings] = await Promise.all([
    db.dailyPlans.where('date').aboveOrEqual(key).toArray(),
    db.attempts.where('date').aboveOrEqual(key).toArray(),
    db.bossCards.toArray(),
    getSettings(),
  ])
  const learned = [
    ...plans.flatMap((p) => (p.done.newChars ? (p.tasks.find((t) => t.id === 'newChars')?.picks ?? []).map((x) => ({ char: x.char, date: p.date })) : [])),
    ...attempts.map((a) => ({ char: a.char, date: a.date })),
    ...cards.filter((c) => c.answeredOn).map((c) => ({ char: c.char, date: c.answeredOn! })),
  ]
  const chars = weeklyPool({ today, learned })
  if (!chars.length) return null
  const xiezi = allXiezi(ds)
  const sources = new Map(cards.map((c) => [c.char, c.sources]))
  return (await db.exams.add({
    kind: 'weekly',
    key,
    title: '周 Boss 战',
    date: today,
    chars,
    write: chars.filter((c) => needsWriting(ds, xiezi, c, sources.get(c) ?? [], settings.extensionWriting)),
    status: 'pending',
    progressLessonId: settings.progressLessonId ?? undefined,
  })) as number
}

/** 记下周 Boss / 单元挑战的结果：results 是每个字的总结果，detail 分开记认读和默写。 */
export async function finishExam(
  id: number,
  results: Record<string, boolean>,
  today = localDate(),
  detail: Pick<ExamRow, 'readResults' | 'writeResults'> = {},
): Promise<void> {
  const values = Object.values(results)
  await db.exams.update(id, {
    status: 'done',
    results,
    ...detail,
    accuracy: values.length ? values.filter(Boolean).length / values.length : 0,
    doneOn: today,
  })
}

export function useExams(): ExamRow[] | undefined {
  return useLiveQuery(() => db.exams.toArray())
}
