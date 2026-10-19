import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sample } from '../assessment/logic/sampling'
import { KaiChar } from '../handwriting/KaiChar'
import { loadStrokes } from '../handwriting/strokes'
import { FLASH_SECONDS, LEVEL_NAMES } from './logic/difficulty'
import { poolForLevel } from './logic/generators'
import { RoundSummary } from './RoundSummary'
import { recordRound, useChallengeStat, type RoundOutcome } from './store'
import { useChallenge } from './useChallenge'
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
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)

  useEffect(() => {
    if (phase !== 'play') return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= endsAt) setPhase('review')
    }, 200)
    return () => window.clearInterval(id)
  }, [phase, endsAt])

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
    setOutcome(null)
    setNow(t)
    setEndsAt(t + (FLASH_SECONDS[lv] ?? 60) * 1000)
    setPhase('play')
  }

  const answer = (isKnown: boolean) => {
    const char = deck[index]
    if (isKnown) setKnown((k) => [...k, char])
    else setUnknown((u) => [...u, char])
    if (index + 1 >= deck.length) setPhase('review')
    else setIndex(index + 1)
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
        回首页
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
            <p>
              在 <strong>{FLASH_SECONDS[stat.level]} 秒</strong>内大声读出尽量多的字，认识就点“认识”，不认识点“跳过”。
            </p>
            <p className="muted">
              难度 {stat.level}：{LEVEL_NAMES[stat.level]} · 最好成绩 {stat.best[stat.level] ?? 0} 个
            </p>
            <button type="button" className="btn btn-primary big-btn" onClick={start}>
              开始
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
          <h2>时间到！看看拼音，刚才读错的字点一下</h2>
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
            完成，看成绩
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
          <button type="button" className="btn btn-primary big-btn" onClick={() => answer(true)}>
            认识
          </button>
          <button type="button" className="btn big-btn" onClick={() => answer(false)}>
            跳过
          </button>
        </div>
      </section>
    </div>
  )
}
