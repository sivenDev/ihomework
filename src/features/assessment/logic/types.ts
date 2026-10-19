import type { BookId } from '../../../data/types'

export type Mark = 'correct' | 'wrong'
export type DictationMark = 'correct' | 'wrong' | 'blank'

export interface RecognitionItem {
  char: string
  book: BookId
  result?: Mark
}

export interface ExtensionLayer {
  /** 本层代表的字数（用于估算） */
  size: number
  items: { char: string; result?: Mark }[]
}

export interface ExtensionPart {
  layers: ExtensionLayer[]
  /** 所有层测完，或某层正确率过低而停止 */
  finished: boolean
}

export interface DictationItem {
  char: string
  /** 朗读时使用的词语，帮助孩子区分同音字 */
  word: string
  result?: DictationMark
}

export interface WordsPart {
  chars: { char: string; result?: 0 | 1 | 2 }[]
  words: { word: string; result?: boolean }[]
}

export interface ReadingPart {
  text: string
  seconds: number
  stalls: number
  done: boolean
}

export const RUBRIC_ITEMS = [
  { key: 'elements', label: '要素', low: '缺时间、地点、人物、事件中的几项', high: '四项都有' },
  { key: 'order', label: '顺序', low: '想到哪写到哪', high: '有起因、经过、结果' },
  { key: 'sentences', label: '句子', low: '句子不完整', high: '句子完整通顺' },
  { key: 'details', label: '细节', low: '只写“做了什么”', high: '有动作、语言、心情' },
  { key: 'handwriting', label: '书写', low: '错别字超过 5 个', high: '错别字不超过 2 个' },
] as const

export type RubricKey = (typeof RUBRIC_ITEMS)[number]['key']
export type RubricScores = Record<RubricKey, 1 | 2 | 3>

export const WRITING_LEVELS = [
  { level: 1, goal: '写出 3 句完整的话' },
  { level: 2, goal: '5 句以上，时间、地点、人物、事件齐全' },
  { level: 3, goal: '一段话（8～10 句），有起因、经过、结果' },
  { level: 4, goal: '有开头和结尾的短文，加入动作、语言、心情等细节' },
  { level: 5, goal: '恰当使用比喻、拟人等修辞和积累的好词' },
] as const

export interface WritingPart {
  imageId?: string
  photoId?: string
  scores?: RubricScores
  level?: 1 | 2 | 3 | 4 | 5
  done: boolean
}

export interface AssessmentParts {
  recognition?: { items: RecognitionItem[] }
  extension?: ExtensionPart
  dictation?: { items: DictationItem[] }
  words?: WordsPart
  reading?: ReadingPart
  writing?: WritingPart
}

export type Focus = '识字' | '写作' | '并行'
export type Route = '补漏' | '同步' | '拓展'
export type PracticeLevel = '轻松' | '标准' | '加强'

export interface Report {
  date: string
  progressLessonId: string
  recognition: {
    tested: number
    correct: number
    accuracy: number
    /** 课内识字量估算 */
    estimate: number
    learned: number
    perBook: { book: BookId; learned: number; tested: number; correct: number }[]
  }
  extension?: { estimate: number; layersTested: number }
  dictation?: { tested: number; correct: number; accuracy: number }
  words?: { charScore: number; charMax: number; wordsKnown: number; wordsTested: number }
  reading?: { charsPerMinute: number; stalls: number; seconds: number }
  writing?: { total: number; scores: RubricScores; level: number }
  /** 待攻克清单：认读或听写出错的字 */
  backlog: string[]
  focus: Focus
  route: Route
  level: PracticeLevel
}

export interface RunData {
  sampleSize: number
  progressLessonId: string
  parts: AssessmentParts
  report?: Report
}
