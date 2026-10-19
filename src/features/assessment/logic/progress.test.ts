import { describe, expect, it } from 'vitest'
import { canFinish, partStatus } from './progress'
import type { RecognitionItem, RunData } from './types'

function run(recognition: RecognitionItem[], extra: Partial<RunData['parts']> = {}): RunData {
  return { sampleSize: 10, progressLessonId: 'x', parts: { recognition: { items: recognition }, ...extra } }
}

const items = (correct: number, wrong: number, unanswered = 0): RecognitionItem[] => [
  ...Array.from({ length: correct }, () => ({ char: '天', book: 'g1a' as const, result: 'correct' as const })),
  ...Array.from({ length: wrong }, () => ({ char: '地', book: 'g1a' as const, result: 'wrong' as const })),
  ...Array.from({ length: unanswered }, () => ({ char: '人', book: 'g1a' as const })),
]

describe('partStatus', () => {
  it('tracks recognition from todo to doing to done', () => {
    expect(partStatus(run(items(0, 0, 3)), 'recognition')).toBe('todo')
    expect(partStatus(run(items(1, 0, 2)), 'recognition')).toBe('doing')
    expect(partStatus(run(items(2, 1)), 'recognition')).toBe('done')
  })

  it('unlocks extension only after recognition is done at 90% or more', () => {
    expect(partStatus(run(items(9, 0, 1)), 'extension')).toBe('locked')
    expect(partStatus(run(items(8, 2)), 'extension')).toBe('locked')
    expect(partStatus(run(items(9, 1)), 'extension')).toBe('todo')
    expect(partStatus(run(items(9, 1), { extension: { layers: [], finished: true } }), 'extension')).toBe('done')
  })

  it('treats sampled parts with nothing to ask as done', () => {
    expect(partStatus(run([], { dictation: { items: [] } }), 'dictation')).toBe('done')
    expect(partStatus(run([], { words: { chars: [], words: [] } }), 'words')).toBe('done')
    expect(partStatus(run([]), 'dictation')).toBe('todo')
  })

  it('marks reading and writing done by their flags', () => {
    expect(partStatus(run([], { reading: { text: '天', seconds: 0, stalls: 0, done: false } }), 'reading')).toBe('doing')
    expect(partStatus(run([], { writing: { done: true } }), 'writing')).toBe('done')
  })
})

describe('canFinish', () => {
  const dictationDone = { dictation: { items: [{ char: '人', word: '人', result: 'correct' as const }] } }

  it('needs recognition and dictation', () => {
    expect(canFinish(run(items(5, 5)))).toBe(false)
    expect(canFinish(run(items(5, 5), dictationDone))).toBe(true)
  })

  it('needs extension too once it is unlocked', () => {
    expect(canFinish(run(items(10, 0), dictationDone))).toBe(false)
    expect(canFinish(run(items(10, 0), { ...dictationDone, extension: { layers: [], finished: true } }))).toBe(true)
  })
})
