import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PinyinText } from '../../components/PinyinText'
import { getSpeaker } from '../../lib/speech'
import { sample } from '../assessment/logic/sampling'
import { KaiChar } from '../handwriting/KaiChar'
import { loadStrokes } from '../handwriting/strokes'
import { MicUnavailableError, startMic, type MicSession } from './audio/mic'
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
type Mode = 'voice' | 'tap'

/** 播放一段录音，播完（或出错）后返回 */
function playClip(url: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(url)
    audio.onended = () => resolve()
    audio.onerror = () => resolve()
    void audio.play().catch(() => resolve())
  })
}

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/**
 * 生字闪认：限时内读出尽量多的字。
 * - 声音模式（F005）：读完一个字自动翻页，并录下每个字的读音；结束后回听“自己读的 vs 标准读音”纠错。
 * - 按钮模式：点“认识 / 跳过”（麦克风不可用时使用）。
 */
export function FlashRecall() {
  const ctx = useChallenge()
  const stat = useChallengeStat('flash')
  const [phase, setPhase] = useState<Phase>('intro')
  const [mode, setMode] = useState<Mode>('voice')
  const [micNotice, setMicNotice] = useState<string | null>(null)
  const [level, setLevel] = useState(1)
  const [deck, setDeck] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [known, setKnown] = useState<string[]>([])
  const [unknown, setUnknown] = useState<string[]>([])
  const [misread, setMisread] = useState<Set<string>>(new Set())
  const [clips, setClips] = useState<Record<string, string>>({})
  const [endsAt, setEndsAt] = useState(0)
  const [now, setNow] = useState(0)
  const [taps, setTaps] = useState<number[]>([])
  const [pausedAt, setPausedAt] = useState<number | null>(null)
  const [listening, setListening] = useState({ level: 0, speaking: false })
  const [playing, setPlaying] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)
  const mic = useRef<MicSession | null>(null)
  const deckRef = useRef<{ deck: string[]; index: number }>({ deck: [], index: 0 })
  // 播放序号：每次开始新的播放或离开页面时加一，正在进行的“从头听一遍”据此停止
  const playToken = useRef(0)
  // 本关所有录音的地址，开始新一关或离开页面时统一释放
  const clipUrls = useRef<string[]>([])
  const think = useThinkDelay(`${phase}-${index}`, FLASH_THINK_MS, pausedAt !== null)

  useEffect(() => {
    deckRef.current = { deck, index }
  }, [deck, index])

  // 倒计时与麦克风音量提示
  useEffect(() => {
    if (phase !== 'play' || pausedAt !== null) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (mic.current) setListening({ level: mic.current.level(), speaking: mic.current.speaking() })
      if (t >= endsAt) setPhase('review')
    }, 100)
    return () => window.clearInterval(id)
  }, [phase, endsAt, pausedAt])

  // 离开限时阶段就关麦克风
  useEffect(() => {
    if (phase !== 'play' && mic.current) {
      mic.current.stop()
      mic.current = null
    }
  }, [phase])

  // 离开页面时释放麦克风和录音
  useEffect(() => {
    const urls = clipUrls.current
    return () => {
      mic.current?.stop()
      // 这里要的就是卸载时的最新播放序号：让正在进行的“从头听一遍”停止
      // eslint-disable-next-line react-hooks/exhaustive-deps
      playToken.current++
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  // 预先加载下一个字的字形，翻页更快
  useEffect(() => {
    if (phase === 'play' && deck[index + 1]) void loadStrokes(deck[index + 1]).catch(() => {})
  }, [phase, deck, index])

  if (!ctx || !stat) return <div className="page muted">正在加载…</div>
  const { ds, progress, learned } = ctx
  const seconds = FLASH_SECONDS[level] ?? 60

  const advance = () => {
    const { deck: d, index: i } = deckRef.current
    if (i + 1 >= d.length) setPhase('review')
    else setIndex(i + 1)
  }

  const start = async (wanted: Mode) => {
    const lv = stat.level
    let pool = poolForLevel(ds, progress, lv)
    if (pool.length < 10) pool = poolForLevel(ds, progress, Math.min(5, lv + 2))
    let actual: Mode = wanted
    setMicNotice(null)
    clipUrls.current.forEach((url) => URL.revokeObjectURL(url))
    clipUrls.current.length = 0
    if (wanted === 'voice') {
      try {
        const session = await startMic()
        session.onUtterance((_, clip) => {
          const { deck: d, index: i } = deckRef.current
          const char = d[i]
          if (!char) return
          const url = URL.createObjectURL(clip)
          clipUrls.current.push(url)
          setClips((c) => ({ ...c, [char]: url }))
          setKnown((k) => (k.includes(char) ? k : [...k, char]))
          advance()
        })
        mic.current = session
      } catch (err) {
        actual = 'tap'
        setMicNotice(err instanceof MicUnavailableError ? `${err.message}，这次改用按钮闯关。` : '麦克风打不开，这次改用按钮闯关。')
      }
    }
    const t = Date.now()
    const newDeck = sample(pool, pool.length)
    deckRef.current = { deck: newDeck, index: 0 }
    setMode(actual)
    setLevel(lv)
    setDeck(newDeck)
    setIndex(0)
    setKnown([])
    setUnknown([])
    setMisread(new Set())
    setClips({})
    setTaps([])
    setPausedAt(null)
    setOutcome(null)
    setNow(t)
    setEndsAt(t + (FLASH_SECONDS[lv] ?? 60) * 1000)
    setPhase('play')
  }

  const skip = (at: number) => {
    if (mode === 'tap' && !think.ready) return
    setUnknown((u) => [...u, deck[index]])
    if (mode === 'tap') tapped(at)
    advance()
  }

  const tapped = (at: number) => {
    // 按钮模式：从字出现到点按钮的时间，用来察觉“没读就点”
    const nextTaps = [...taps, at - (think.readyAt - FLASH_THINK_MS)]
    setTaps(nextTaps)
    if (flashRushing(nextTaps)) setPausedAt(at)
  }

  const markKnown = (at: number) => {
    if (!think.ready) return
    setKnown((k) => [...k, deck[index]])
    tapped(at)
    advance()
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
    playToken.current++
    const answers = [
      ...known.map((c) => ({ char: c, correct: !misread.has(c), learned: learned.has(c) })),
      ...unknown.map((c) => ({ char: c, correct: false, learned: learned.has(c) })),
    ]
    const score = answers.filter((a) => a.correct).length
    setOutcome(await recordRound({ activity: 'flash', level, score, answers }))
    setPhase('done')
  }

  const playMine = async (char: string) => {
    const url = clips[char]
    if (!url) return
    const token = ++playToken.current
    setPlaying(char)
    await playClip(url)
    if (playToken.current === token) setPlaying(null)
  }

  const playAll = async () => {
    const token = ++playToken.current
    for (const char of known) {
      if (playToken.current !== token) return
      setPlaying(char)
      if (clips[char]) await playClip(clips[char])
      await wait(300)
      if (playToken.current !== token) return
      getSpeaker().speak(char)
      await wait(1200)
    }
    if (playToken.current === token) setPlaying(null)
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
          <RoundSummary title="时间到！" score={known.length - misread.size} unit="个字" outcome={outcome} onAgain={() => void start(mode)} />
        ) : (
          <section className="card game-intro">
            <p className="intro-text">
              <PinyinText text={`在 ${FLASH_SECONDS[stat.level]} 秒内大声读出尽量多的字。用声音闯关时，读完一个字会自动换下一个；不认识就点“跳过”。`} speak />
            </p>
            <p className="muted" data-testid="flash-info">
              难度 {stat.level}：{LEVEL_NAMES[stat.level]} · {FLASH_SECONDS[stat.level]} 秒 · 最好成绩 {stat.best[stat.level] ?? 0} 个
            </p>
            <div className="option-row">
              <button type="button" className="btn btn-primary big-btn" onClick={() => void start('voice')}>
                <PinyinText text="🎤 用声音闯关" />
              </button>
              <button type="button" className="btn big-btn" onClick={() => void start('tap')}>
                <PinyinText text="用按钮闯关" />
              </button>
            </div>
            <p className="muted">
              <PinyinText text="声音只在这台平板上用来判断你读完没有，录音不会保存。" />
            </p>
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
            <PinyinText text={mode === 'voice' ? '时间到！听一听自己读的，读错的字点一下' : '时间到！看看拼音，刚才读错的字点一下'} speak />
          </h2>
          {mode === 'voice' && known.length > 0 && (
            <button type="button" className="btn" onClick={() => void playAll()}>
              <PinyinText text="▶ 从头听一遍" />
            </button>
          )}
          <div className="review-grid">
            {known.map((c) => (
              <div key={c} className="review-cell" data-playing={playing === c}>
                <button
                  type="button"
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
                {mode === 'voice' && (
                  <span className="review-audio">
                    <button type="button" className="audio-btn" aria-label={`听我读的“${c}”`} disabled={!clips[c]} onClick={() => void playMine(c)}>
                      ▶
                    </button>
                    <button type="button" className="audio-btn" aria-label={`听“${c}”的标准读音`} onClick={() => getSpeaker().speak(c)}>
                      🔊
                    </button>
                  </span>
                )}
              </div>
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
      {micNotice && (
        <p className="card mic-notice" role="status">
          <PinyinText text={micNotice} />
        </p>
      )}
      <div className="flash-timer" data-testid="flash-timer">
        <div className="flash-timer-fill" style={{ width: `${(left / seconds) * 100}%` }} />
        <span>
          {left} 秒 · 已读 {known.length} 个
        </span>
      </div>
      <section className="card flash-card">
        <KaiChar char={deck[index]} size={220} />
        {mode === 'voice' ? (
          <>
            <div className="mic-meter" data-speaking={listening.speaking} data-testid="mic-meter" aria-label={listening.speaking ? '正在听你读' : '等你读'}>
              <span className="mic-dot" aria-hidden="true">
                🎤
              </span>
              <span className="mic-bar">
                <span style={{ width: `${Math.min(100, listening.level * 400)}%` }} />
              </span>
              <PinyinText text={listening.speaking ? '正在听…' : '大声读出来'} />
            </div>
            <div className="option-row">
              <button type="button" className="btn big-btn" onClick={() => skip(Date.now())}>
                <PinyinText text="跳过" />
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setPhase('review')}>
                <PinyinText text="提前结束" />
              </button>
            </div>
          </>
        ) : (
          <div className="option-row">
            <button type="button" className="btn btn-primary big-btn" disabled={!think.ready} onClick={() => markKnown(Date.now())}>
              <PinyinText text="认识" />
            </button>
            <button type="button" className="btn big-btn" disabled={!think.ready} onClick={() => skip(Date.now())}>
              <PinyinText text="跳过" />
            </button>
          </div>
        )}
      </section>
      {pausedAt !== null && <FocusBreak message="要大声读出来再点哦" onResume={resume} />}
    </div>
  )
}
