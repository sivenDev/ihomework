import HanziWriter from 'hanzi-writer'
import { useEffect, useRef, useState } from 'react'
import { judgeWriting, type WritingResult } from './logic/judge'
import { strokeLoader } from './strokes'
import './handwriting.css'

export type BoardMode = 'trace' | 'dictation'
type BoardState = 'loading' | 'animating' | 'quiz' | 'done' | 'error'

export const BOARD_PADDING = 20

/**
 * 田字格书写板。
 * - trace（描红）：先演示笔顺，再在浅色字形上逐笔描写，写错马上提示。
 * - dictation（默写）：不显示字形，按笔顺逐笔判断，同一笔错 3 次给出提示；可以“写不出，看答案”。
 */
export function HanziBoard({
  char,
  mode,
  size = 320,
  onDone,
}: {
  char: string
  mode: BoardMode
  size?: number
  onDone: (result: WritingResult) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const writerRef = useRef<HanziWriter | null>(null)
  const startQuiz = useRef<() => void>(() => {})
  const done = useRef(onDone)
  // 组件按字和模式重新挂载（调用方传入 key），初始状态直接由模式决定
  const [state, setState] = useState<BoardState>(mode === 'trace' ? 'animating' : 'loading')
  const [result, setResult] = useState<WritingResult | null>(null)

  useEffect(() => {
    done.current = onDone
  }, [onDone])

  useEffect(() => {
    const el = host.current
    if (!el) return
    el.innerHTML = ''
    let hinted = false
    let cancelled = false
    const finish = (r: WritingResult) => {
      if (cancelled) return
      setResult(r)
      setState('done')
      done.current(r)
    }
    const writer = HanziWriter.create(el, char, {
      width: size,
      height: size,
      padding: BOARD_PADDING,
      showOutline: mode === 'trace',
      showCharacter: false,
      strokeColor: '#2b2622',
      outlineColor: '#e6dccb',
      highlightColor: '#2a8c80',
      drawingColor: '#c8553d',
      drawingWidth: 18,
      strokeAnimationSpeed: 1.2,
      delayBetweenStrokes: 200,
      charDataLoader: strokeLoader,
      onLoadCharDataError: () => !cancelled && setState('error'),
    })
    writerRef.current = writer
    const quiz = () => {
      if (cancelled) return
      void writer
        .quiz({
          showHintAfterMisses: mode === 'trace' ? 1 : 3,
          onMistake: (data) => {
            if (mode === 'dictation' && data.mistakesOnStroke >= 3) hinted = true
          },
          onComplete: ({ totalMistakes }) => finish(judgeWriting({ totalMistakes, hinted, gaveUp: false })),
        })
        .then(() => !cancelled && setState('quiz'))
    }
    startQuiz.current = quiz
    if (mode === 'trace') void writer.animateCharacter({ onComplete: quiz })
    else quiz()
    return () => {
      cancelled = true
      writer.cancelQuiz()
      writerRef.current = null
    }
  }, [char, mode, size])

  const replay = () => {
    const writer = writerRef.current
    if (!writer) return
    writer.cancelQuiz()
    setResult(null)
    setState('animating')
    void writer.animateCharacter({ onComplete: () => startQuiz.current() })
  }

  const giveUp = () => {
    const writer = writerRef.current
    if (!writer) return
    writer.cancelQuiz()
    setResult('wrong')
    setState('done')
    done.current('wrong')
    void writer.showCharacter()
    void writer.animateCharacter()
  }

  return (
    <div className="hanzi-board-wrap">
      <div
        className="hanzi-board"
        style={{ width: size, height: size }}
        data-testid="hanzi-board"
        data-state={state}
        data-result={result ?? ''}
        aria-label={mode === 'trace' ? `描红：${char}` : '默写'}
      >
        <svg className="tianzige" viewBox="0 0 100 100" aria-hidden="true">
          <rect x="1" y="1" width="98" height="98" />
          <line x1="0" y1="50" x2="100" y2="50" />
          <line x1="50" y1="0" x2="50" y2="100" />
        </svg>
        <div ref={host} className="hanzi-board-host" />
      </div>
      {state === 'error' && <p className="error">这个字暂时没有笔顺数据。</p>}
      <div className="button-row board-actions">
        {mode === 'trace' && state !== 'loading' && (
          <button type="button" className="btn btn-quiet" onClick={replay}>
            再看一遍笔顺
          </button>
        )}
        {mode === 'dictation' && state === 'quiz' && (
          <button type="button" className="btn btn-quiet" onClick={giveUp}>
            写不出，看答案
          </button>
        )}
      </div>
    </div>
  )
}
