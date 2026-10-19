import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../app/useSettings'
import { getSpeaker } from '../../lib/speech'
import { addMistakes } from '../boss/api'
import { currentLesson } from '../textbook/logic/scope'
import { useDataset } from '../textbook/useDataset'
import { HanziBoard } from './HanziBoard'
import type { WritingResult } from './logic/judge'
import './handwriting.css'

type Phase = 'trace' | 'dictation' | 'done'

const RESULT_TEXT: Record<WritingResult, string> = {
  correct: '写对了！',
  hinted: '有提示，再练练',
  wrong: '先记住笔顺，明天再写',
}

/** 写字练习：当前课写字表中的字，先描红，再默写；默写不过关的字进入错字 Boss。 */
export function WritePracticePage() {
  const ds = useDataset()
  const settings = useSettings()
  const [char, setChar] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('trace')
  const [results, setResults] = useState<Record<string, WritingResult>>({})

  if (!ds || !settings) return <div className="page muted">正在加载…</div>
  const lesson = currentLesson(ds.books, settings.progressLessonId ? { lessonId: settings.progressLessonId } : null)

  const pick = (c: string) => {
    setChar(c)
    setPhase('trace')
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>写字练习</h1>
        <Link className="btn btn-quiet" to="/">
          回首页
        </Link>
      </div>

      {!lesson ? (
        <p className="card">请家长先在“课本与字库”里设置当前学到的课。</p>
      ) : lesson.xiezi.length === 0 ? (
        <p className="card">《{lesson.title}》没有要求会写的字，可以去打错字 Boss。</p>
      ) : (
        <div className="write-layout">
          <section className="card write-list" aria-label="本课要会写的字">
            <h2>《{lesson.title}》</h2>
            <div className="chip-row">
              {lesson.xiezi.map((c) => (
                <button
                  type="button"
                  key={c}
                  className="write-chip"
                  aria-pressed={c === char}
                  data-result={results[c] ?? ''}
                  aria-label={`练习“${c}”${results[c] ? `，${RESULT_TEXT[results[c]]}` : ''}`}
                  onClick={() => pick(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>

          <section className="card write-board">
            {!char ? (
              <p className="muted">选一个字开始练习：先描红，再默写。</p>
            ) : (
              <>
                <div className="write-head">
                  <span className="write-py">{ds.chars[char]?.py[0]}</span>
                  <button type="button" className="btn btn-quiet" onClick={() => getSpeaker().speak(char)}>
                    🔊
                  </button>
                  <span className="muted">{phase === 'trace' ? '第 1 步：描红' : phase === 'dictation' ? '第 2 步：默写' : '完成'}</span>
                </div>
                {phase === 'trace' && (
                  <HanziBoard key={`${char}-trace`} char={char} mode="trace" onDone={() => setPhase('dictation')} />
                )}
                {phase === 'dictation' && (
                  <HanziBoard
                    key={`${char}-dictation`}
                    char={char}
                    mode="dictation"
                    onDone={(r) => {
                      setResults((prev) => ({ ...prev, [char]: r }))
                      setPhase('done')
                      if (r !== 'correct') void addMistakes([char], 'dictation')
                    }}
                  />
                )}
                {phase === 'done' && results[char] && (
                  <div className="write-result" role="status">
                    <h3>{RESULT_TEXT[results[char]]}</h3>
                    <button type="button" className="btn" onClick={() => setPhase('trace')}>
                      再练一次
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
