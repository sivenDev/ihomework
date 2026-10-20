import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ReadingLogRow } from '../../db/schema'
import { getSettings, updateSettings } from '../../db/settings'
import { localDate } from '../../lib/date'
import { newId } from '../../lib/id'
import { completeTask } from '../daily/store'
import { bookXpEvent } from '../rewards/logic/xp'
import { awardXp } from '../rewards/store'
import { bookKey, bookList, type BookEntry, type BookLevel } from './booklist'

export function useReadingLogs(): ReadingLogRow[] | undefined {
  return useLiveQuery(() => db.readingLogs.orderBy('id').reverse().toArray())
}

/**
 * 阅读打卡：记下书名和时长，完成每日任务中的阅读项。
 * 标记“读完”时发读完奖励（同一本书只发一次）。返回这次得到的经验值。
 */
export async function logReading(entry: { title: string; minutes: number; finished: boolean }, today = localDate()): Promise<number> {
  const title = entry.title.trim()
  await db.readingLogs.add({ date: today, title, minutes: entry.minutes, finished: entry.finished })
  await completeTask('reading', today)
  if (!entry.finished) return 0
  const fresh = await awardXp([bookXpEvent(bookKey(title), Date.now())])
  return fresh.reduce((n, e) => n + e.amount, 0)
}

export function useBookList(): BookEntry[] | undefined {
  return useLiveQuery(async () => {
    const s = await getSettings()
    return bookList(s.customBooks, s.hiddenBooks)
  })
}

export async function addBook(title: string, intro: string, level: BookLevel) {
  const s = await getSettings()
  await updateSettings({ customBooks: [...s.customBooks, { id: newId(), title: title.trim(), intro: intro.trim(), level }] })
}

/** 内置书记为隐藏，家长添加的书直接删掉。 */
export async function removeBook(id: string) {
  const s = await getSettings()
  if (s.customBooks.some((b) => b.id === id)) await updateSettings({ customBooks: s.customBooks.filter((b) => b.id !== id) })
  else await updateSettings({ hiddenBooks: [...s.hiddenBooks, id] })
}

export async function restoreBuiltinBooks() {
  await updateSettings({ hiddenBooks: [] })
}
