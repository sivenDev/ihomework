// 字库数据结构：由 scripts/build-data 生成，应用只读。

export type BookId = 'g1a' | 'g1b' | 'g2a' | 'g2b'

export type LessonKind = '识字' | '汉语拼音' | '阅读' | '语文园地'

export interface CharReading {
  char: string
  py: string
}

export interface Lesson {
  id: string
  book: BookId
  unit: number
  kind: LessonKind
  num: number
  title: string
  /** 识字表中的生字（含课本读音） */
  shizi: CharReading[]
  /** 识字表中蓝色的多音字：此前已认读，此处学习新读音 */
  duoyin: CharReading[]
  /** 写字表中的字 */
  xiezi: string[]
}

export interface Book {
  id: BookId
  name: string
  printed: { shizi: number; xiezi: number }
  lessons: Lesson[]
}

export type Formation = '象形' | '会意' | '形声' | '其他'

export type Structure = '独体' | '左右' | '上下' | '左中右' | '上中下' | '包围' | '其他'

export interface CharInfo {
  /** 读音，第一个为默认读音（课本字取课本读音） */
  py: string[]
  radical: string
  strokes: number
  structure: Structure
  formation: Formation
  /** 形声字的形旁 / 声旁 */
  semantic?: string
  phonetic?: string
  /** 常用组词，按常用程度排序 */
  words: string[]
  /** 常用程度排名（1 最常用）；0 表示未知 */
  rank: number
  /** 《通用规范汉字表》一级字序号；不在一级字表中为 0 */
  level1: number
}

export interface Dataset {
  books: Book[]
  chars: Record<string, CharInfo>
  /** 拓展字：一级字表中课本以外的字，按常用程度排序 */
  extension: string[]
  /** 字族：声旁 → 含有该声旁的字（课本字与一级字） */
  families: Record<string, string[]>
}
