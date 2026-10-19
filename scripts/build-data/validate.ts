import type { Dataset } from '../../src/data/types'
import { textbookChars } from './build'

export interface ValidationResult {
  errors: string[]
  warnings: string[]
}

/** 校验字库：errors 会让构建失败，warnings 只提示（例如课本本身的特殊情况）。 */
export function validateDataset(ds: Dataset, level1: string[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const ids = new Set<string>()
  for (const book of ds.books) {
    let shizi = 0
    let xiezi = 0
    const seen = new Set<string>()
    for (const lesson of book.lessons) {
      if (ids.has(lesson.id)) errors.push(`课的编号重复：${lesson.id}`)
      ids.add(lesson.id)
      if (!lesson.title) errors.push(`${lesson.id} 缺少课题`)
      if (!lesson.unit) errors.push(`${lesson.id} 没有归属单元`)
      for (const r of lesson.shizi) {
        if (seen.has(r.char)) errors.push(`${book.name}识字表中“${r.char}”重复出现（${lesson.id}）`)
        seen.add(r.char)
      }
      shizi += lesson.shizi.length
      xiezi += lesson.xiezi.length
    }
    if (shizi !== book.printed.shizi) errors.push(`${book.name}识字表 ${shizi} 字，与课本标注的 ${book.printed.shizi} 字不符`)
    if (xiezi !== book.printed.xiezi) errors.push(`${book.name}写字表 ${xiezi} 字，与课本标注的 ${book.printed.xiezi} 字不符`)
  }

  const inTextbook = textbookChars(ds.books)
  for (const ch of inTextbook) {
    const info = ds.chars[ch]
    if (!info) {
      errors.push(`字典缺少课本字“${ch}”`)
      continue
    }
    if (!info.py.length) errors.push(`“${ch}”缺少拼音`)
    if (!info.radical) errors.push(`“${ch}”缺少部首`)
    if (!info.strokes) errors.push(`“${ch}”缺少笔画数`)
  }

  for (const ch of ds.extension) {
    if (inTextbook.has(ch)) errors.push(`拓展字“${ch}”与课本字重复`)
    if (!ds.chars[ch]?.py.length) errors.push(`拓展字“${ch}”缺少拼音`)
  }
  const covered = new Set([...inTextbook, ...ds.extension])
  const uncovered = level1.filter((c) => !covered.has(c))
  if (uncovered.length) errors.push(`一级字表中有 ${uncovered.length} 字未被收录：${uncovered.slice(0, 20).join('')}`)

  // 课本本身的特殊情况只提示：多音字此前未作为生字出现；写字表的字没在识字表出现过
  const learned = new Set<string>()
  for (const book of ds.books) {
    for (const lesson of book.lessons) for (const r of lesson.shizi) learned.add(r.char)
    for (const lesson of book.lessons) {
      for (const r of lesson.duoyin) if (!learned.has(r.char)) warnings.push(`${lesson.id} 多音字“${r.char}”此前未作为生字出现`)
      for (const c of lesson.xiezi) if (!learned.has(c)) warnings.push(`${lesson.id} 写字“${c}”不在识字表中`)
    }
  }

  return { errors, warnings }
}
