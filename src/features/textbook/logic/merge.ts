import { pinyin } from 'pinyin-pro'
import type { CharInfo, CharReading, Dataset } from '../../../data/types'

/** 家长对某一课的修改：增删生字和写字。 */
export interface LessonEdit {
  lessonId: string
  addShizi: CharReading[]
  removeShizi: string[]
  addXiezi: string[]
  removeXiezi: string[]
}

/** 家长对某个字的修改：读音、组词、是否已核对。 */
export interface CharEdit {
  char: string
  py?: string
  words?: string[]
  verified?: boolean
}

export function emptyLessonEdit(lessonId: string): LessonEdit {
  return { lessonId, addShizi: [], removeShizi: [], addXiezi: [], removeXiezi: [] }
}

const defaultPy = (ch: string) => pinyin(ch, { toneType: 'symbol' })

function fallbackInfo(ch: string): CharInfo {
  return {
    py: [defaultPy(ch)],
    radical: '',
    strokes: 0,
    structure: '其他',
    formation: '其他',
    words: [],
    rank: 0,
    level1: 0,
  }
}

/** 内置字库 + 家长修改 → 应用实际使用的字库。不修改传入的数据。 */
export function applyEdits(ds: Dataset, lessonEdits: LessonEdit[], charEdits: CharEdit[]): Dataset {
  const byLesson = new Map(lessonEdits.map((e) => [e.lessonId, e]))
  const books = ds.books.map((book) => ({
    ...book,
    lessons: book.lessons.map((lesson) => {
      const edit = byLesson.get(lesson.id)
      if (!edit) return lesson
      const removeShizi = new Set(edit.removeShizi)
      const removeXiezi = new Set(edit.removeXiezi)
      const shizi = lesson.shizi.filter((r) => !removeShizi.has(r.char))
      for (const r of edit.addShizi)
        if (!shizi.some((s) => s.char === r.char)) shizi.push({ char: r.char, py: r.py || defaultPy(r.char) })
      const xiezi = lesson.xiezi.filter((c) => !removeXiezi.has(c))
      for (const c of edit.addXiezi) if (!xiezi.includes(c)) xiezi.push(c)
      return { ...lesson, shizi, xiezi }
    }),
  }))

  const chars: Record<string, CharInfo> = { ...ds.chars }
  for (const book of books)
    for (const lesson of book.lessons)
      for (const r of lesson.shizi) if (!chars[r.char]) chars[r.char] = { ...fallbackInfo(r.char), py: [r.py] }
  for (const edit of charEdits) {
    const base = chars[edit.char] ?? fallbackInfo(edit.char)
    chars[edit.char] = {
      ...base,
      ...(edit.py ? { py: [edit.py, ...base.py.filter((p) => p !== edit.py)] } : {}),
      ...(edit.words ? { words: edit.words } : {}),
    }
  }
  return { ...ds, books, chars }
}
