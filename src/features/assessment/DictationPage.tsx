import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSpeaker } from '../../lib/speech'
import { dictationPrompt, sampleDictation } from './logic/sampling'
import type { DictationMark } from './logic/types'
import { updateRun } from './store'
import { useAssessment } from './useAssessment'
import './assessment.css'

const DICTATION_COUNT = 20

export function DictationPage() {
  const ctx = useAssessment()
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (ctx && !ctx.run.data.parts.dictation) {
      const items = sampleDictation(ctx.ds, { lessonId: ctx.run.data.progressLessonId }, DICTATION_COUNT)
      // 在事务里再检查一次，避免重复渲染时覆盖已经抽好的题
      void updateRun(ctx.run.id, (d) => (d.parts.dictation ? d : { ...d, parts: { ...d.parts, dictation: { items } } }))
    }
  }, [ctx])

  if (!ctx?.run.data.parts.dictation) return <div className="page muted">正在准备…</div>
  const { run } = ctx
  const items = run.data.parts.dictation!.items
  const index = items.findIndex((i) => !i.result)
  const item = items[index]

  const mark = (result: DictationMark | undefined, at: number) => {
    setRevealed(false)
    return updateRun(run.id, (d) => {
      d.parts.dictation!.items[at].result = result
      return d
    })
  }
  const undoIndex = index === -1 ? items.length - 1 : index - 1

  return (
    <div className="page mark-page">
      <div className="topbar">
        <h1>听写</h1>
        <Link className="btn btn-quiet" to="/parent/assessment">
          {index === -1 ? '返回' : '暂停'}
        </Link>
      </div>
      {index === -1 ? (
        <section className="card done-card">
          <h2>听写完成</h2>
          <p>
            {items.length
              ? `共 ${items.length} 个字，写对 ${items.filter((i) => i.result === 'correct').length} 个。`
              : '当前进度还没有要求会写的字，这一项不用做。'}
          </p>
          <Link className="btn btn-primary" to="/parent/assessment">
            返回评估
          </Link>
        </section>
      ) : (
        <section className="card dictation-card">
          <p className="muted mark-progress">
            第 {index + 1} 个 / 共 {items.length} 个——点“朗读”，请孩子在纸上写下来
          </p>
          <button type="button" className="btn btn-primary speak-btn" onClick={() => getSpeaker().speak(dictationPrompt(item.char, item.word))}>
            🔊 朗读
          </button>
          <div className="answer" aria-live="polite">
            {revealed ? (
              <>
                <span className="answer-char" data-testid="dictation-answer">
                  {item.char}
                </span>
                <span className="muted">{dictationPrompt(item.char, item.word)}</span>
              </>
            ) : (
              <button type="button" className="btn btn-quiet" onClick={() => setRevealed(true)}>
                孩子写完后，显示答案
              </button>
            )}
          </div>
          <div className="mark-buttons">
            <button type="button" className="btn mark-btn mark-correct" onClick={() => mark('correct', index)}>
              ✓ 写对了
            </button>
            <button type="button" className="btn mark-btn mark-wrong" onClick={() => mark('wrong', index)}>
              写错了
            </button>
            <button type="button" className="btn mark-btn mark-wrong" onClick={() => mark('blank', index)}>
              写不出
            </button>
          </div>
        </section>
      )}
      {undoIndex >= 0 && items[undoIndex]?.result && (
        <button type="button" className="btn btn-quiet undo-btn" onClick={() => mark(undefined, undoIndex)}>
          撤销上一个（{items[undoIndex].char}）
        </button>
      )}
    </div>
  )
}
