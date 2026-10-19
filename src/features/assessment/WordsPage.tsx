import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { HanziSpeak } from '../../components/HanziSpeak'
import { sampleWords } from './logic/sampling'
import { updateRun } from './store'
import { useAssessment } from './useAssessment'
import './assessment.css'

const CHAR_COUNT = 10
const WORD_COUNT = 5

export function WordsPage() {
  const ctx = useAssessment()

  useEffect(() => {
    if (ctx && !ctx.run.data.parts.words) {
      const part = sampleWords(ctx.ds, { lessonId: ctx.run.data.progressLessonId }, CHAR_COUNT, WORD_COUNT)
      void updateRun(ctx.run.id, (d) => (d.parts.words ? d : { ...d, parts: { ...d.parts, words: part } }))
    }
  }, [ctx])

  if (!ctx?.run.data.parts.words) return <div className="page muted">正在准备…</div>
  const { run } = ctx
  const { chars, words } = run.data.parts.words!
  const charIndex = chars.findIndex((c) => c.result === undefined)
  const wordIndex = words.findIndex((w) => w.result === undefined)
  const done = charIndex === -1 && wordIndex === -1

  const markChar = (result: 0 | 1 | 2) =>
    updateRun(run.id, (d) => {
      d.parts.words!.chars[charIndex].result = result
      return d
    })
  const markWord = (result: boolean) =>
    updateRun(run.id, (d) => {
      d.parts.words!.words[wordIndex].result = result
      return d
    })

  return (
    <div className="page mark-page">
      <div className="topbar">
        <h1>组词与词语理解</h1>
        <Link className="btn btn-quiet" to="/parent/assessment">
          {done ? '返回' : '暂停'}
        </Link>
      </div>
      {done ? (
        <section className="card done-card">
          <h2>完成</h2>
          <p>
            组词得分 {chars.reduce((n, c) => n + (c.result ?? 0), 0)} / {chars.length * 2}，词语理解 {words.filter((w) => w.result).length} /{' '}
            {words.length}。
          </p>
          <Link className="btn btn-primary" to="/parent/assessment">
            返回评估
          </Link>
        </section>
      ) : charIndex !== -1 ? (
        <>
          <p className="muted mark-progress">
            组词 第 {charIndex + 1} 个 / 共 {chars.length} 个——请孩子用这个字组词，说出几个算几个
          </p>
          <div className="flash-char">{chars[charIndex].char}</div>
          <div className="mark-buttons">
            <button type="button" className="btn mark-btn mark-correct" onClick={() => markChar(2)}>
              组出 2 个
            </button>
            <button type="button" className="btn mark-btn" onClick={() => markChar(1)}>
              组出 1 个
            </button>
            <button type="button" className="btn mark-btn mark-wrong" onClick={() => markChar(0)}>
              组不出
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted mark-progress">
            词语理解 第 {wordIndex + 1} 个 / 共 {words.length} 个——请孩子说说意思，或者用它说一句话
          </p>
          <div className="flash-word">
            <HanziSpeak text={words[wordIndex].word} />
          </div>
          <div className="mark-buttons">
            <button type="button" className="btn mark-btn mark-correct" onClick={() => markWord(true)}>
              ✓ 说对了
            </button>
            <button type="button" className="btn mark-btn mark-wrong" onClick={() => markWord(false)}>
              说不出
            </button>
          </div>
        </>
      )}
    </div>
  )
}
