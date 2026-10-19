import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getSpeaker } from '../../lib/speech'
import { KaiChar } from '../handwriting/KaiChar'
import { LEVEL_NAMES } from './logic/difficulty'
import { detectiveRound, poolForLevel, type DetectiveQuestion } from './logic/generators'
import { RoundSummary } from './RoundSummary'
import { recordRound, useChallengeStat, type RoundAnswer, type RoundOutcome } from './store'
import { useChallenge } from './useChallenge'
import './challenges.css'

const QUESTIONS = 8

type Phase = 'reading' | 'meaning' | 'reveal'

/** 部首侦探：看形旁猜意思，看声旁猜读音。 */
export function RadicalDetective() {
  const ctx = useChallenge()
  const stat = useChallengeStat('detective')
  const [round, setRound] = useState<{ level: number; questions: DetectiveQuestion[] } | null>(null)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('reading')
  const [picked, setPicked] = useState<{ reading?: string; meaning?: string }>({})
  const [answers, setAnswers] = useState<RoundAnswer[]>([])
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)

  if (!ctx || !stat) return <div className="page muted">正在加载…</div>
  const { ds, progress, learned } = ctx

  const start = () => {
    // 范围内可出题的字太少时，扩大到更宽的范围
    let questions: DetectiveQuestion[] = []
    for (let lv = stat.level; lv <= 5 && questions.length < QUESTIONS; lv++) {
      questions = detectiveRound(ds, poolForLevel(ds, progress, lv), QUESTIONS)
    }
    setRound({ level: stat.level, questions })
    setIndex(0)
    setPhase('reading')
    setPicked({})
    setAnswers([])
    setOutcome(null)
  }

  const header = (
    <div className="topbar">
      <h1>🔍 部首侦探</h1>
      <Link className="btn btn-quiet" to="/">
        回首页
      </Link>
    </div>
  )

  if (!progress) return <div className="page">{header}<p className="card">请家长先在“课本与字库”里设置当前学到的课。</p></div>

  if (!round || (outcome && round)) {
    return (
      <div className="page">
        {header}
        {outcome && round ? (
          <RoundSummary title="破案完成！" score={answers.filter((a) => a.correct).length} unit={`/ ${answers.length} 个案子`} outcome={outcome} onAgain={start} />
        ) : (
          <section className="card game-intro">
            <p>每个字都藏着两条线索：<strong>形旁</strong>告诉你意思，<strong>声旁</strong>告诉你读音。</p>
            <p className="muted">
              难度 {stat.level}：{LEVEL_NAMES[stat.level]} · 一关 {QUESTIONS} 个案子
            </p>
            <button type="button" className="btn btn-primary big-btn" onClick={start}>
              开始破案
            </button>
          </section>
        )}
      </div>
    )
  }

  if (!round.questions.length) {
    return (
      <div className="page">
        {header}
        <p className="card">这个范围里还没有适合推理的形声字，过几课再来吧！</p>
      </div>
    )
  }

  const q = round.questions[index]
  const readingRight = picked.reading === q.reading
  const meaningRight = picked.meaning === q.meaning

  const chooseReading = (option: string) => {
    if (phase !== 'reading') return
    setPicked({ reading: option })
    setPhase('meaning')
  }

  const chooseMeaning = (option: string) => {
    if (phase !== 'meaning') return
    setPicked((p) => ({ ...p, meaning: option }))
    setPhase('reveal')
    getSpeaker().speak(q.char)
  }

  const next = async () => {
    const all = [...answers, { char: q.char, correct: readingRight && meaningRight, learned: learned.has(q.char) }]
    setAnswers(all)
    if (index + 1 < round.questions.length) {
      setIndex(index + 1)
      setPhase('reading')
      setPicked({})
      return
    }
    setOutcome(await recordRound({ activity: 'detective', level: round.level, score: all.filter((a) => a.correct).length, answers: all }))
  }

  const optionState = (option: string, answer: string, chosen?: string) =>
    chosen === undefined ? '' : option === answer ? 'answer' : option === chosen ? 'wrong' : ''

  return (
    <div className="page">
      {header}
      <p className="muted game-progress">
        案子 {index + 1} / {round.questions.length} · 难度 {round.level}
      </p>
      <section className="card detective-card">
        <KaiChar char={q.char} size={180} />
        <div className="clues" aria-label="线索">
          <span className="clue clue-semantic">{q.semantic}</span>
          <span className="clue-plus">+</span>
          <span className="clue clue-phonetic">{q.phonetic}</span>
        </div>

        <div className="question">
          <h2>① 它可能读什么？</h2>
          <div className="option-row">
            {q.readingOptions.map((o) => (
              <button
                type="button"
                key={o}
                className="btn option"
                data-state={optionState(o, q.reading, picked.reading)}
                disabled={phase !== 'reading'}
                onClick={() => chooseReading(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {phase !== 'reading' && (
          <div className="question">
            <h2>② 它可能和什么有关？</h2>
            <div className="option-row">
              {q.meaningOptions.map((o) => (
                <button
                  type="button"
                  key={o}
                  className="btn option"
                  data-state={optionState(o, q.meaning, picked.meaning)}
                  disabled={phase !== 'meaning'}
                  onClick={() => chooseMeaning(o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'reveal' && (
          <div className="reveal" role="status">
            <p className="reveal-title">{readingRight && meaningRight ? '推理正确！' : '真相是：'}</p>
            <p>
              <strong>{q.semantic}</strong> 表示意思：{q.meaning}；<strong>{q.phonetic}</strong> 提示读音
              {q.phoneticReading ? `（${q.phonetic} 读 ${q.phoneticReading}）` : ''}，所以“{q.char}”读 <strong>{q.reading}</strong>。
            </p>
            <button type="button" className="btn btn-primary big-btn" onClick={next}>
              {index + 1 < round.questions.length ? '下一个案子' : '结案'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
