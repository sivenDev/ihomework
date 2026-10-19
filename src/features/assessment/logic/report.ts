import type { Dataset } from '../../../data/types'
import type { Progress } from '../../textbook/logic/scope'
import { learnedByBook } from './sampling'
import type { Focus, PracticeLevel, Report, Route, RunData } from './types'

/** 建议规则的阈值（PRD 4.5.2、4.5.3） */
export const THRESHOLDS = {
  recognitionWeak: 0.75,
  recognitionStrong: 0.9,
  dictationStrong: 0.85,
  /** 写作总分（满分 15）不高于此值视为写作偏弱 */
  writingWeakTotal: 9,
}

const HAN = /\p{Script=Han}/gu

export function suggestFocus(recognition: number, writingTotal: number | undefined): Focus {
  if (recognition < THRESHOLDS.recognitionWeak) return '识字'
  if (recognition >= THRESHOLDS.recognitionStrong && writingTotal !== undefined && writingTotal <= THRESHOLDS.writingWeakTotal)
    return '写作'
  return '并行'
}

export function suggestRoute(recognition: number, dictation: number | undefined, backlog: string[]): Route {
  if (recognition >= THRESHOLDS.recognitionStrong && dictation !== undefined && dictation >= THRESHOLDS.dictationStrong)
    return '拓展'
  if (backlog.length) return '补漏'
  return '同步'
}

export function suggestLevel(recognition: number): PracticeLevel {
  return recognition < THRESHOLDS.recognitionWeak ? '加强' : '标准'
}

/** 根据一次评估的作答结果生成报告。认读必须已完成；其他部分没做就不出现在报告里。 */
export function computeReport(ds: Dataset, run: RunData, date: string): Report {
  const progress: Progress = { lessonId: run.progressLessonId }
  const items = run.parts.recognition?.items ?? []
  const learned = learnedByBook(ds, progress)

  const perBook = [...learned].map(([book, chars]) => {
    const tested = items.filter((i) => i.book === book && i.result)
    return { book, learned: chars.length, tested: tested.length, correct: tested.filter((i) => i.result === 'correct').length }
  })
  const tested = perBook.reduce((n, b) => n + b.tested, 0)
  const correct = perBook.reduce((n, b) => n + b.correct, 0)
  const accuracy = tested ? correct / tested : 0
  const estimate = Math.round(perBook.reduce((n, b) => n + (b.tested ? (b.correct / b.tested) * b.learned : 0), 0))

  const ext = run.parts.extension
  const extension = ext?.layers.length
    ? {
        estimate: Math.round(
          ext.layers.reduce((n, l) => {
            const done = l.items.filter((i) => i.result)
            return n + (done.length ? (done.filter((i) => i.result === 'correct').length / done.length) * l.size : 0)
          }, 0),
        ),
        layersTested: ext.layers.filter((l) => l.items.every((i) => i.result)).length,
      }
    : undefined

  const dict = run.parts.dictation?.items.filter((i) => i.result)
  const dictation = dict?.length
    ? { tested: dict.length, correct: dict.filter((i) => i.result === 'correct').length, accuracy: dict.filter((i) => i.result === 'correct').length / dict.length }
    : undefined

  const w = run.parts.words
  const words = w
    ? {
        charScore: w.chars.reduce((n, c) => n + (c.result ?? 0), 0),
        charMax: w.chars.length * 2,
        wordsKnown: w.words.filter((x) => x.result).length,
        wordsTested: w.words.length,
      }
    : undefined

  const r = run.parts.reading
  const reading =
    r?.done && r.seconds > 0
      ? { charsPerMinute: Math.round(((r.text.match(HAN)?.length ?? 0) / r.seconds) * 60), stalls: r.stalls, seconds: r.seconds }
      : undefined

  const wr = run.parts.writing
  const writing =
    wr?.done && wr.scores && wr.level
      ? { total: Object.values(wr.scores).reduce((n, s) => n + s, 0), scores: wr.scores, level: wr.level }
      : undefined

  const backlog = [
    ...new Set([
      ...items.filter((i) => i.result === 'wrong').map((i) => i.char),
      ...(dict ?? []).filter((i) => i.result !== 'correct').map((i) => i.char),
    ]),
  ]

  return {
    date,
    progressLessonId: run.progressLessonId,
    recognition: { tested, correct, accuracy, estimate, learned: [...learned.values()].reduce((n, l) => n + l.length, 0), perBook },
    ...(extension ? { extension } : {}),
    ...(dictation ? { dictation } : {}),
    ...(words ? { words } : {}),
    ...(reading ? { reading } : {}),
    ...(writing ? { writing } : {}),
    backlog,
    focus: suggestFocus(accuracy, writing?.total),
    route: suggestRoute(accuracy, dictation?.accuracy, backlog),
    level: suggestLevel(accuracy),
  }
}
