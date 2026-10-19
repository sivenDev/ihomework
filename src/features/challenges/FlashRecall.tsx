import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PinyinText } from '../../components/PinyinText'
import { sample } from '../assessment/logic/sampling'
import { KaiChar } from '../handwriting/KaiChar'
import { loadStrokes } from '../handwriting/strokes'
import { FocusBreak } from './FocusBreak'
import { FLASH_SECONDS, LEVEL_NAMES } from './logic/difficulty'
import { FLASH_THINK_MS, flashRushing } from './logic/focus'
import { poolForLevel } from './logic/generators'
import { RoundSummary } from './RoundSummary'
import { recordRound, useChallengeStat, type RoundOutcome } from './store'
import { useChallenge } from './useChallenge'
import { useThinkDelay } from './useThinkDelay'
import './challenges.css'

type Phase = 'intro' | 'play' | 'review' | 'done'

/** 生字闪认：限时内认出尽量多的字；结束后把读错的点出来，诚实打分。 */
export function FlashRecall() {
  const ctx = useChallenge()
  const stat = useChallengeStat('flash')
  const [phase, setPhase] = useState<Phase>('intro')
  const [level, setLevel] = useState(1)
  const [deck, setDeck] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [known, setKnown] = useState<string[]>([])
  const [unknown, setUnknown] = useState<string[]>([])
  const [misread, setMisread] = useState<Set<string>>(new Set())
  const [endsAt, setEndsAt] = useState(0)
  const [now, setNow] = useState(0)
  const [taps, setTaps] = useState<number[]>([])
  const [pausedAt, setPausedAt] = useState<number | null>(null)
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)
  const think = useThinkDelay(`${phase}-${index}`, FLASH_THINK_MS, pausedAt !== null)

  useEffect(() => {
    if (phase !== 'play' || pausedAt !== null) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= endsAt) setPhase('review')
    }, 200)
    return () => window.clearInterval(id)
  }, [phase, endsAt, pausedAt])

  // 预先加载下一个字的字形，翻页更快
  useEffect(() => {
    if (phase === 'play' && deck[index + 1]) void loadStrokes(deck[index + 1]).catch(() => {})
  }, [phase, deck, index])

  if (!ctx || !stat) return <div className="page muted">正在加载…</div>
  const { ds, progress, learned } = ctx
  const seconds = FLASH_SECONDS[level] ?? 60

  const start = () => {
    const lv = stat.level
    let pool = poolForLevel(ds, progress, lv)
    if (pool.length < 10) pool = poolForLevel(ds, progress, Math.min(5, lv + 2))
    const t = Date.now()
    setLevel(lv)
    setDeck(sample(pool, pool.length))
    setIndex(0)
    setKnown([])
    setUnknown([])
    setMisread(new Set())
    setTaps([])
    setPausedAt(null)
    setOutcome(null)
    setNow(t)
    setEndsAt(t + (FLASH_SECONDS[lv] ?? 60) * 1000)
    setPhase('play')
  }

  const answer = (isKnown: boolean) => {
    if (!think.ready) return
    const char = deck[index]
    // 从字出现到点按钮的时间，用来察觉“没读就点”
    const shownFor = Date.now() - (think.readyAt - FLASH_THINK_MS)
    const nextTaps = [...taps, shownFor]
    setTaps(nextTaps)
    if (isKnown) setKnown((k) => [...k, char])
    else setUnknown((u) => [...u, char])
    if (index + 1 >= deck.length) setPhase('review')
    else setIndex(index + 1)
    if (flashRushing(nextTaps)) setPausedAt(Date.now())
  }

  const resume = () => {
    // 提醒期间倒计时暂停
    const t = Date.now()
    setEndsAt((e) => e + (t - (pausedAt ?? t)))
    setNow(t)
    setPausedAt(null)
    setTaps([])
  }

  const finish = async () => {
    const answers = [
      ...known.map((c) => ({ char: c, correct: !misread.has(c), learned: learned.has(c) })),
      ...unknown.map((c) => ({ char: c, correct: false, learned: learned.has(c) })),
    ]
    const score = answers.filter((a) => a.correct).length
    setOutcome(await recordRound({ activity: 'flash', level, score, answers }))
    setPhase('done')
  }

  const header = (
    <div className="topbar">
      <h1>⚡ 生字闪认</h1>
      <Link className="btn btn-quiet" to="/">
        <PinyinText text="回首页" />
      </Link>
    </div>
  )

  if (!progress) return <div className="page">{header}<p className="card">请家长先在“课本与字库”里设置当前学到的课。</p></div>

  if (phase === 'intro' || (phase === 'done' && outcome)) {
    return (
      <div className="page">
        {header}
        {phase === 'done' && outcome ? (
          <RoundSummary title="时间到！" score={known.length - misread.size} unit="个字" outcome={outcome} onAgain={start} />
        ) : (
          <section className="card game-intro">
            <p className="intro-text">
              <PinyinText text={`在 ${FLASH_SECONDS[stat.level]} 秒内大声读出尽量多的字。读出来了点“认识”，不认识点“跳过”。`} speak />
            </p>
            <p className="muted" data-testid="flash-info">
              难度 {stat.level}：{LEVEL_NAMES[stat.level]} · {FLASH_SECONDS[stat.level]} 秒 · 最好成绩 {stat.best[stat.level] ?? 0} 个
            </p>
            <button type="button" className="btn btn-primary big-btn" onClick={start}>
              <PinyinText text="开始" />
            </button>
          </section>
        )}
      </div>
    )
  }

  if (phase === 'review') {
    return (
      <div className="page">
        {header}
        <section className="card review-card">
          <h2>
            <PinyinText text="时间到！看看拼音，刚才读错的字点一下" speak />
          </h2>
          <div className="review-grid">
            {known.map((c) => (
              <button
                type="button"
                key={c}
                className="review-item"
                aria-pressed={misread.has(c)}
                aria-label={`${c} ${ds.chars[c]?.py[0] ?? ''}${misread.has(c) ? '，读错了' : ''}`}
                onClick={() =>
                  setMisread((m) => {
                    const next = new Set(m)
                    if (next.has(c)) next.delete(c)
                    else next.add(c)
                    return next
                  })
                }
              >
                <span className="slot-py">{ds.chars[c]?.py[0]}</span>
                <span className="review-char">{c}</span>
              </button>
            ))}
          </div>
          {unknown.length > 0 && <p className="muted">跳过的字：{unknown.join('、')}（会进入错字 Boss 的是学过的字）</p>}
          <button type="button" className="btn btn-primary big-btn" onClick={finish}>
            <PinyinText text="完成，看成绩" />
          </button>
        </section>
      </div>
    )
  }

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000))
  return (
    <div className="page flash-page">
      {header}
      <div className="flash-timer" data-testid="flash-timer">
        <div className="flash-timer-fill" style={{ width: `${(left / seconds) * 100}%` }} />
        <span>
          {left} 秒 · 已认 {known.length} 个
        </span>
      </div>
      <section className="card flash-card">
        <KaiChar char={deck[index]} size={220} />
        <div className="option-row">
          <button type="button" className="btn btn-primary big-btn" disabled={!think.ready} onClick={() => answer(true)}>
            <PinyinText text="认识" />
          </button>
          <button type="button" className="btn big-btn" disabled={!think.ready} onClick={() => answer(false)}>
            <PinyinText text="跳过" />
          </button>
        </div>
      </section>
      {pausedAt !== null && <FocusBreak message="要大声读出来再点哦" onResume={resume} />}
    </div>
  )
}
