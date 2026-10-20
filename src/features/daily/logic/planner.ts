// 每日任务清单（PRD 4.5.1、4.5.3）：按级别配额生成任务、估算时长、分段，超时的任务标为可选。纯函数。
import type { LevelConfig } from './levels'
import type { NewCharPick } from './newChars'

export type TaskId = 'preview' | 'review' | 'newChars' | 'boss' | 'reading' | 'bonus'

export interface DailyTask {
  id: TaskId
  /** 预计时长（分钟） */
  minutes: number
  /** 必做；超出时长的任务标为可选 */
  required: boolean
  segment: 1 | 2
  /** 预习、复习要练的字 */
  chars?: string[]
  /** 新字任务取到的字 */
  picks?: NewCharPick[]
  /** 今天要打的 Boss 张数（超出上限的顺延到第二天） */
  count?: number
  /** 入口还没开放（阅读打卡由计划 07 提供） */
  placeholder?: boolean
}

export interface PlanInput {
  cfg: LevelConfig
  weekend: boolean
  /** 下一课的字（侦察任务） */
  previewChars: string[]
  /** 本课的字（当天复习） */
  reviewChars: string[]
  newPicks: NewCharPick[]
  /** 今天要打的 Boss 张数 */
  bossToday: number
}

/** 预计时长（分钟） */
export const ESTIMATE = {
  preview: (n: number) => Math.ceil(n * 0.5) + 2,
  review: () => 3,
  newChars: (n: number) => Math.ceil(n * 1.2),
  boss: (n: number) => Math.ceil((n * 25) / 60),
  reading: () => 10,
}

/** 时长不够时的保留顺序 */
const PRIORITY: TaskId[] = ['boss', 'review', 'newChars', 'preview']

/** 防过载：到期的 Boss 超过上限时，新字按超出量减少（最少 0），超出的 Boss 卡顺延。 */
export function overload(cfg: LevelConfig, bossDue: number): { newChars: number; bossToday: number } {
  const over = Math.max(0, bossDue - cfg.bossCap)
  return { newChars: Math.max(0, cfg.newChars - over), bossToday: Math.min(bossDue, cfg.bossCap) }
}

/** 在一段的时长内按优先级保留必做任务；优先级最高的任务始终保留。 */
function fitSegment(tasks: DailyTask[], budget: number): void {
  let used = 0
  const byPriority = [...tasks].sort((a, b) => PRIORITY.indexOf(a.id) - PRIORITY.indexOf(b.id))
  byPriority.forEach((t, i) => {
    t.required = i === 0 || used + t.minutes <= budget
    if (t.required) used += t.minutes
  })
}

export function planTasks(input: PlanInput): DailyTask[] {
  const { cfg } = input
  const twoSegments = cfg.segments === 2
  const tasks: DailyTask[] = []
  // 两段时：第一段学新（预习、新字），休息后第二段回忆（复习、Boss）
  if (input.previewChars.length)
    tasks.push({ id: 'preview', minutes: ESTIMATE.preview(input.previewChars.length), required: true, segment: 1, chars: input.previewChars })
  if (input.reviewChars.length)
    tasks.push({ id: 'review', minutes: ESTIMATE.review(), required: true, segment: twoSegments ? 2 : 1, chars: input.reviewChars })
  if (input.newPicks.length)
    tasks.push({ id: 'newChars', minutes: ESTIMATE.newChars(input.newPicks.length), required: true, segment: 1, picks: input.newPicks })
  if (input.bossToday > 0)
    tasks.push({ id: 'boss', minutes: ESTIMATE.boss(input.bossToday), required: true, segment: twoSegments ? 2 : 1, count: input.bossToday })

  // 某一段没有任务时，当天只有一段
  if (!tasks.some((t) => t.segment === 1) || !tasks.some((t) => t.segment === 2)) for (const t of tasks) t.segment = 1
  for (const seg of [1, 2] as const) fitSegment(tasks.filter((t) => t.segment === seg), cfg.segmentMinutes)

  const order: TaskId[] = twoSegments ? ['preview', 'newChars', 'review', 'boss'] : ['preview', 'review', 'newChars', 'boss']
  tasks.sort((a, b) => a.segment - b.segment || order.indexOf(a.id) - order.indexOf(b.id))

  const last = tasks.at(-1)?.segment ?? 1
  tasks.push({ id: 'reading', minutes: ESTIMATE.reading(), required: false, segment: last, placeholder: true })
  if (input.weekend && cfg.weekendBonusMinutes > 0) tasks.push({ id: 'bonus', minutes: cfg.weekendBonusMinutes, required: false, segment: last })
  return tasks
}

/** 有必做任务的段 */
export function requiredSegments(tasks: DailyTask[]): (1 | 2)[] {
  return [...new Set(tasks.filter((t) => t.required).map((t) => t.segment))].sort()
}

export function segmentDone(tasks: DailyTask[], done: Partial<Record<TaskId, boolean>>, segment: 1 | 2): boolean {
  const list = tasks.filter((t) => t.required && t.segment === segment)
  return list.length > 0 && list.every((t) => done[t.id])
}

export function dayComplete(tasks: DailyTask[], done: Partial<Record<TaskId, boolean>>): boolean {
  const segments = requiredSegments(tasks)
  return segments.length > 0 && segments.every((s) => segmentDone(tasks, done, s))
}
