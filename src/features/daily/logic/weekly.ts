// 周 Boss 战与单元挑战（PRD 4.5.1）。纯函数，日期格式 YYYY-MM-DD。
import type { Book, Lesson } from '../../../data/types'
import { sample, type Rng } from '../../assessment/logic/sampling'
import { addDays } from '../../boss/logic/scheduler'
import { lessonsInOrder } from '../../textbook/logic/scope'
import { weekday } from './levels'

/** 周 Boss 一次抽多少个字 */
export const WEEKLY_SIZE = 20

/** 这一周的周一 */
export function weekStart(date: string): string {
  return addDays(date, -((weekday(date) + 6) % 7))
}

/** 每周六起可以打周 Boss */
export function weeklyBossOpen(date: string): boolean {
  const w = weekday(date)
  return w === 6 || w === 0
}

/** 从本周（周一到今天）学过、练过的字中随机抽最多 20 个。 */
export function weeklyPool(opts: { today: string; learned: { char: string; date: string }[]; rng?: Rng }): string[] {
  const from = weekStart(opts.today)
  const chars = [...new Set(opts.learned.filter((l) => l.date >= from && l.date <= opts.today).map((l) => l.char))]
  return sample(chars, WEEKLY_SIZE, opts.rng)
}

export function unitKey(lesson: Pick<Lesson, 'book' | 'unit'>): string {
  return `${lesson.book}-${lesson.unit}`
}

/** 家长把进度推进到新单元时，返回刚结束的那个单元的课；同一单元内移动、往回调或第一次设置时返回 null。 */
export function unitEnded(books: Book[], prevLessonId: string | null, nextLessonId: string): Lesson[] | null {
  if (!prevLessonId) return null
  const order = lessonsInOrder(books)
  const prev = order.findIndex((l) => l.id === prevLessonId)
  const next = order.findIndex((l) => l.id === nextLessonId)
  if (prev < 0 || next <= prev || unitKey(order[prev]) === unitKey(order[next])) return null
  const key = unitKey(order[prev])
  return order.filter((l) => unitKey(l) === key)
}
