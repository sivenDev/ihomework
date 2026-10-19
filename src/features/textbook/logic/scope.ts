import type { Book, Lesson } from '../../../data/types'

/** 课本进度：当前正在学的课。null 表示家长还没设置。 */
export type Progress = { lessonId: string } | null

export function lessonsInOrder(books: Book[]): Lesson[] {
  return books.flatMap((b) => b.lessons)
}

function currentIndex(order: Lesson[], progress: Progress): number {
  if (!progress) return -1
  return order.findIndex((l) => l.id === progress.lessonId)
}

export function currentLesson(books: Book[], progress: Progress): Lesson | undefined {
  const order = lessonsInOrder(books)
  return order[currentIndex(order, progress)]
}

/** 已学的课：从第一课到当前课（含当前课）。 */
export function learnedLessons(books: Book[], progress: Progress): Lesson[] {
  const order = lessonsInOrder(books)
  return order.slice(0, currentIndex(order, progress) + 1)
}

const unique = (chars: string[]) => [...new Set(chars)]

/** 已学的生字（识字表），按学习顺序。 */
export function learnedShizi(books: Book[], progress: Progress): string[] {
  return unique(learnedLessons(books, progress).flatMap((l) => l.shizi.map((r) => r.char)))
}

/** 已学的写字表中的字，按学习顺序。 */
export function learnedXiezi(books: Book[], progress: Progress): string[] {
  return unique(learnedLessons(books, progress).flatMap((l) => l.xiezi))
}

/** 当前课之后第一个有生字的课（跳过没有生字的拼音课），用于预习。 */
export function nextLesson(books: Book[], progress: Progress): Lesson | undefined {
  const order = lessonsInOrder(books)
  return order.slice(currentIndex(order, progress) + 1).find((l) => l.shizi.length > 0)
}

/** 预习之后的课程中的生字，用于“超前学习”。 */
export function aheadShizi(books: Book[], progress: Progress): string[] {
  const order = lessonsInOrder(books)
  const next = nextLesson(books, progress)
  const start = next ? order.indexOf(next) + 1 : currentIndex(order, progress) + 1
  return unique(order.slice(start).flatMap((l) => l.shizi.map((r) => r.char)))
}
