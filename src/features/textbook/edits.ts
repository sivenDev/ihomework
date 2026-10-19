import { db } from '../../db/schema'
import type { CharReading } from '../../data/types'
import { emptyLessonEdit, type CharEdit, type LessonEdit } from './logic/merge'

async function updateLesson(lessonId: string, change: (edit: LessonEdit) => void) {
  await db.transaction('rw', db.lessonEdits, async () => {
    const edit = (await db.lessonEdits.get(lessonId)) ?? emptyLessonEdit(lessonId)
    change(edit)
    await db.lessonEdits.put(edit)
  })
}

const without = <T>(list: T[], pred: (x: T) => boolean) => list.filter((x) => !pred(x))

export function addShizi(lessonId: string, reading: CharReading) {
  return updateLesson(lessonId, (e) => {
    if (e.removeShizi.includes(reading.char)) e.removeShizi = without(e.removeShizi, (c) => c === reading.char)
    else e.addShizi = [...without(e.addShizi, (r) => r.char === reading.char), reading]
  })
}

export function removeShizi(lessonId: string, char: string) {
  return updateLesson(lessonId, (e) => {
    if (e.addShizi.some((r) => r.char === char)) e.addShizi = without(e.addShizi, (r) => r.char === char)
    else if (!e.removeShizi.includes(char)) e.removeShizi.push(char)
  })
}

export function addXiezi(lessonId: string, char: string) {
  return updateLesson(lessonId, (e) => {
    if (e.removeXiezi.includes(char)) e.removeXiezi = without(e.removeXiezi, (c) => c === char)
    else if (!e.addXiezi.includes(char)) e.addXiezi.push(char)
  })
}

export function removeXiezi(lessonId: string, char: string) {
  return updateLesson(lessonId, (e) => {
    if (e.addXiezi.includes(char)) e.addXiezi = without(e.addXiezi, (c) => c === char)
    else if (!e.removeXiezi.includes(char)) e.removeXiezi.push(char)
  })
}

export async function updateChar(char: string, patch: Omit<CharEdit, 'char'>) {
  await db.transaction('rw', db.charEdits, async () => {
    const current = (await db.charEdits.get(char)) ?? { char }
    await db.charEdits.put({ ...current, ...patch })
  })
}
