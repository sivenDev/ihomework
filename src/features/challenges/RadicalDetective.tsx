import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PinyinText } from '../../components/PinyinText'
import { getSpeaker } from '../../lib/speech'
import { KaiChar } from '../handwriting/KaiChar'
import { FocusBreak } from './FocusBreak'
import { LEVEL_NAMES } from './logic/difficulty'
import { needsFocusBreak, THINK_MS, type Answer } from './logic/focus'
import { detectiveRound, poolForLevel, type DetectiveQuestion } from './logic/generators'
import { RoundSummary } from './RoundSummary'
import { recordRound, useChallengeStat, type RoundAnswer, type RoundOutcome } from './store'
import { useChallenge } from './useChallenge'
import { useThinkDelay } from './useThinkDelay'
import './challenges.css'

/** 一关的案子数（F002：缩短到 6 个，避免注意力分散） */
const DETECTIVE_QUESTIONS = 6

type Phase = 'reading' | 'meaning' | 'reveal'

/** 思考时间进度条：选项还不能点时显示。 */
function ThinkBar({ ready }: { ready: boolean }) {
  if (ready) return null
  return (
    <div className="think-bar" aria-hidden="true">
      <div className="think-fill" style={{ animationDuration: `${THINK_MS}ms` }} />
      <span>
        <PinyinText text="想一想…" />
      </span>
    </div>
  )
}

/** 部首侦探：看形旁猜意思，看声旁猜读音。 */
export function RadicalDetective() {
  const ctx = useChallenge()
  const stat = useChallengeStat('detective')
  const [round, setRound] = useState<{ level: number; questions: DetectiveQuestion[] } | null>(null)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('reading')
  const [picked, setPicked] = useState<{ reading?: string; meaning?: string; ms: number[] }>({ ms: [] })
  const [answers, setAnswers] = useState<RoundAnswer[]>([])
  const [focusHistory, setFocusHistory] = useState<Answer[]>([])
  const [onBreak, setOnBreak] = useState(false)
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)
  const think = useThinkDelay(`${index}-${phase}-${round ? 'on' : 'off'}`, THINK_MS, onBreak)

  if (!ctx || !stat) return <div className="page muted">正在加载…</div>
  const { ds, progress, learned } = ctx

  const start = () => {
    // 范围内可出题的字太少时，扩大到更宽的范围
    let questions: DetectiveQuestion[] = []
    for (let lv = stat.level; lv <= 5 && questions.length < DETECTIVE_QUESTIONS; lv++) {
      questions = detectiveRound(ds, poolForLevel(ds, progress, lv), DETECTIVE_QUESTIONS)
    }
    setRound({ level: stat.level, questions })
    setIndex(0)
    setPhase('reading')
    setPicked({ ms: [] })
    setAnswers([])
    setFocusHistory([])
    setOutcome(null)
  }

  const header = (
    <div className="topbar">
      <h1>🔍 部首侦探</h1>
      <Link className="btn btn-quiet" to="/">
        <PinyinText text="回首页" />
      </Link>
    </div>
  )

  if (!progress) return <div className="page">{header}<p className="card">请家长先在“课本与字库”里设置当前学到的课。</p></div>

  if (!round || outcome) {
    return (
      <div className="page">
        {header}
        {outcome && round ? (
          <RoundSummary title="破案完成！" score={answers.filter((a) => a.correct).length} unit={`/ ${answers.length} 个案子`} outcome={outcome} onAgain={start} />
        ) : (
          <section className="card game-intro">
            <p className="intro-text">
              <PinyinText text="每个字都藏着两条线索：形旁告诉你意思，声旁告诉你读音。" speak />
            </p>
            <p className="muted">
              难度 {stat.level}：{LEVEL_NAMES[stat.level]} · 一关 {DETECTIVE_QUESTIONS} 个案子
            </p>
            <button type="button" className="btn btn-primary big-btn" onClick={start}>
              <PinyinText text="开始破案" />
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
        <p className="card">
          <PinyinText text="这个范围里还没有适合推理的形声字，过几课再来吧！" />
        </p>
      </div>
    )
  }

  const q = round.questions[index]
  const readingRight = picked.reading === q.reading
  const meaningRight = picked.meaning === q.meaning
  const chooseReading = (option: string, at: number) => {
    if (phase !== 'reading' || !think.ready) return
    setPicked({ reading: option, ms: [at - think.readyAt] })
    setPhase('meaning')
  }

  const chooseMeaning = (option: string, at: number) => {
    if (phase !== 'meaning' || !think.ready) return
    setPicked((p) => ({ ...p, meaning: option, ms: [...p.ms, at - think.readyAt] }))
    setPhase('reveal')
    getSpeaker().speak(q.char)
  }

  const next = async () => {
    const correct = readingRight && meaningRight
    const all = [...answers, { char: q.char, correct, learned: learned.has(q.char) }]
    const history = [...focusHistory, { correct, ms: Math.min(...picked.ms) }]
    setAnswers(all)
    setFocusHistory(history)
    if (index + 1 < round.questions.length) {
      if (needsFocusBreak(history)) setOnBreak(true)
      setIndex(index + 1)
      setPhase('reading')
      setPicked({ ms: [] })
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
          <h2>
            <PinyinText text="① 它可能读什么？" speak />
          </h2>
          {phase === 'reading' && <ThinkBar ready={think.ready} />}
          <div className="option-row">
            {q.readingOptions.map((o) => (
              <button
                type="button"
                key={o}
                className="btn option"
                data-state={optionState(o, q.reading, picked.reading)}
                disabled={phase !== 'reading' || !think.ready}
                onClick={() => chooseReading(o, Date.now())}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {phase !== 'reading' && (
          <div className="question">
            <h2>
              <PinyinText text="② 它可能和什么有关？" speak />
            </h2>
            {phase === 'meaning' && <ThinkBar ready={think.ready} />}
            <div className="option-row">
              {q.meaningOptions.map((o) => (
                <button
                  type="button"
                  key={o}
                  className="btn option option-text"
                  data-state={optionState(o, q.meaning, picked.meaning)}
                  disabled={phase !== 'meaning' || !think.ready}
                  onClick={() => chooseMeaning(o, Date.now())}
                >
                  <PinyinText text={o} />
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'reveal' && (
          <div className="reveal" role="status">
            <p className="reveal-title">
              <PinyinText text={readingRight && meaningRight ? '推理正确！' : '真相是：'} />
            </p>
            <p className="reveal-text">
              <strong>{q.semantic}</strong> <PinyinText text={`表示意思：${q.meaning}；`} />
              <strong>{q.phonetic}</strong> <PinyinText text="提示读音" />
              {q.phoneticReading ? `（${q.phonetic} 读 ${q.phoneticReading}）` : ''}，<PinyinText text="所以" />“{q.char}”
              <PinyinText text="读" /> <strong>{q.reading}</strong>。
            </p>
            <button type="button" className="btn btn-primary big-btn" onClick={next}>
              <PinyinText text={index + 1 < round.questions.length ? '下一个案子' : '结案'} />
            </button>
          </div>
        )}
      </section>
      {onBreak && (
        <FocusBreak
          message="慢一点，先看清题目再选哦"
          onResume={() => {
            setOnBreak(false)
            setFocusHistory([])
          }}
        />
      )}
    </div>
  )
}
