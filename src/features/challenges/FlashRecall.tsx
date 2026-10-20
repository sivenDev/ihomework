import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PinyinText } from '../../components/PinyinText'
import { getSpeaker } from '../../lib/speech'
import { sample } from '../assessment/logic/sampling'
import { completeTask, useTodayPlan } from '../daily/store'
import { useTaskParam } from '../daily/useDaily'
import { KaiChar } from '../handwriting/KaiChar'
import { loadStrokes } from '../handwriting/strokes'
import { MicUnavailableError, startMic, type MicSession } from './audio/mic'
import { FocusBreak } from './FocusBreak'
import { FLASH_SECONDS, LEVEL_NAMES } from './logic/difficulty'
import { decide, scoreFlash, type FlashRecord } from './logic/flashCheck'
import { FLASH_THINK_MS, flashRushing } from './logic/focus'
import { poolForLevel } from './logic/generators'
import { RoundSummary } from './RoundSummary'
import { recordRound, useChallengeStat, type RoundOutcome } from './store'
import { useChallenge } from './useChallenge'
import { useThinkDelay } from './useThinkDelay'
import './challenges.css'

type Phase = 'intro' | 'play' | 'review' | 'done'
type Mode = 'voice' | 'tap'

/** 倒计时暂停：专注提醒，或声音模式里的“对一对” */
interface Pause {
  at: number
  reason: 'focus' | 'check'
}

/** 声音模式的“对一对”（F006） */
interface Check {
  char: string
  /** 这个字已经读了几次（含刚读的这次） */
  readings: number
  clip: string
  /** 正在依次播放“你读的”和标准读音 */
  playing: boolean
  /** 放弃这个字时的提示 */
  gaveUp?: boolean
}

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
 * - 声音模式（F005、F006）：读完一个字，马上回放自己的读音和标准读音，孩子判断“一样 / 不一样”，不一样就再读一遍。
 * - 按钮模式：点“认识 / 跳过”，结束后对照拼音自评（麦克风不可用时使用）。
 */
export function FlashRecall() {
  const ctx = useChallenge()
  const stat = useChallengeStat('flash')
  // 从今日任务进入“当天复习”时，只考本课生字
  const task = useTaskParam()
  const plan = useTodayPlan()
  const reviewChars = task === 'review' ? plan?.tasks.find((t) => t.id === 'review')?.chars : undefined
  const [phase, setPhase] = useState<Phase>('intro')
  const [mode, setMode] = useState<Mode>('voice')
  const [micNotice, setMicNotice] = useState<string | null>(null)
  const [level, setLevel] = useState(1)
  const [deck, setDeck] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  // 按钮模式
  const [known, setKnown] = useState<string[]>([])
  const [unknown, setUnknown] = useState<string[]>([])
  const [misread, setMisread] = useState<Set<string>>(new Set())
  const [taps, setTaps] = useState<number[]>([])
  // 声音模式
  const [records, setRecords] = useState<FlashRecord[]>([])
  const [check, setCheck] = useState<Check | null>(null)
  const [retryHint, setRetryHint] = useState<string | null>(null)
  const [listening, setListening] = useState({ level: 0, speaking: false })
  // 共用
  const [endsAt, setEndsAt] = useState(0)
  const [now, setNow] = useState(0)
  const [pause, setPause] = useState<Pause | null>(null)
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)
  const [needPractice, setNeedPractice] = useState<string[]>([])
  const mic = useRef<MicSession | null>(null)
  const live = useRef({
    deck: [] as string[],
    index: 0,
    check: null as Check | null,
    pause: null as Pause | null,
    readings: {} as Record<string, number>,
  })
  // 只接受在这个时刻（麦克风时间轴，毫秒）之后开始的读音，回放的声音不算
  const ignoreBefore = useRef(0)
  const clipUrls = useRef<string[]>([])
  const playToken = useRef(0)
  const think = useThinkDelay(`${phase}-${index}`, FLASH_THINK_MS, pause !== null)

  useEffect(() => {
    live.current.deck = deck
    live.current.index = index
    live.current.check = check
    live.current.pause = pause
  }, [deck, index, check, pause])

  // 倒计时与麦克风音量提示
  useEffect(() => {
    if (phase !== 'play' || pause !== null) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (mic.current) setListening({ level: mic.current.level(), speaking: mic.current.speaking() })
      if (t >= endsAt) setPhase('review')
    }, 100)
    return () => window.clearInterval(id)
  }, [phase, endsAt, pause])

  // “对一对”：依次播放孩子的读音和标准读音，播完才能判断
  const checkChar = check?.char
  const checkClip = check?.clip
  const checkPlaying = check?.playing
  useEffect(() => {
    if (!checkPlaying || !checkChar || !checkClip) return
    const token = ++playToken.current
    void (async () => {
      await playClip(checkClip)
      await wait(300)
      if (playToken.current !== token) return
      await getSpeaker().speakAndWait(checkChar)
      if (playToken.current === token) setCheck((c) => (c && c.char === checkChar ? { ...c, playing: false } : c))
    })()
  }, [checkPlaying, checkChar, checkClip])

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
      // 这里要的就是卸载时的最新播放序号：让正在进行的播放停止
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
    const { deck: d, index: i } = live.current
    setRetryHint(null)
    if (i + 1 >= d.length) setPhase('review')
    else setIndex(i + 1)
  }

  const resumeTimer = () => {
    const t = Date.now()
    const p = live.current.pause
    setEndsAt((e) => e + (t - (p?.at ?? t)))
    setNow(t)
    setPause(null)
  }

  /** 回到听读状态：之前（包括回放）的声音都不算 */
  const listenAgain = () => {
    ignoreBefore.current = mic.current?.now() ?? 0
    resumeTimer()
  }

  const start = async (wanted: Mode) => {
    const lv = stat.level
    let pool = reviewChars ?? poolForLevel(ds, progress, lv)
    if (!reviewChars && pool.length < 10) pool = poolForLevel(ds, progress, Math.min(5, lv + 2))
    let actual: Mode = wanted
    setMicNotice(null)
    clipUrls.current.forEach((url) => URL.revokeObjectURL(url))
    clipUrls.current.length = 0
    if (wanted === 'voice') {
      try {
        const session = await startMic()
        session.onUtterance((utterance, clip) => {
          const { deck: d, index: i, check: c, pause: p } = live.current
          const char = d[i]
          if (!char || c || p || utterance.start < ignoreBefore.current) return
          const url = URL.createObjectURL(clip)
          clipUrls.current.push(url)
          const readings = (live.current.readings[char] ?? 0) + 1
          live.current.readings[char] = readings
          const paused = { at: Date.now(), reason: 'check' as const }
          live.current.pause = paused
          setPause(paused)
          setCheck({ char, readings, clip: url, playing: true })
        })
        mic.current = session
      } catch (err) {
        actual = 'tap'
        setMicNotice(err instanceof MicUnavailableError ? `${err.message}，这次改用按钮闯关。` : '麦克风打不开，这次改用按钮闯关。')
      }
    }
    const t = Date.now()
    const newDeck = sample(pool, pool.length)
    live.current = { deck: newDeck, index: 0, check: null, pause: null, readings: {} }
    ignoreBefore.current = 0
    setMode(actual)
    setLevel(lv)
    setDeck(newDeck)
    setIndex(0)
    setKnown([])
    setUnknown([])
    setMisread(new Set())
    setTaps([])
    setRecords([])
    setCheck(null)
    setRetryHint(null)
    setNeedPractice([])
    setPause(null)
    setOutcome(null)
    setNow(t)
    setEndsAt(t + (FLASH_SECONDS[lv] ?? 60) * 1000)
    setPhase('play')
  }

  // ---------- 声音模式：对一对 ----------

  const judge = (decision: 'same' | 'different') => {
    if (!check || check.playing) return
    const d = decide(check.readings, decision)
    if (d.next === 'retry') {
      const py = ds.chars[check.char]?.py[0] ?? ''
      setCheck(null)
      setRetryHint(`听一听：${py}，再读一遍`)
      void getSpeaker().speakAndWait(check.char).then(listenAgain)
      return
    }
    setRecords((r) => [...r, { char: check.char, result: d.result! }])
    if (d.result === 'gave-up') {
      setCheck({ ...check, gaveUp: true })
      void getSpeaker()
        .speakAndWait(check.char)
        .then(() => wait(800))
        .then(() => {
          setCheck(null)
          listenAgain()
          advance()
        })
      return
    }
    setCheck(null)
    listenAgain()
    advance()
  }

  const replay = (what: 'mine' | 'standard') => {
    if (!check) return
    if (what === 'mine') void playClip(check.clip)
    else getSpeaker().speak(check.char)
  }

  // ---------- 按钮模式 ----------

  const tapped = (at: number) => {
    // 从字出现到点按钮的时间，用来察觉“没读就点”
    const nextTaps = [...taps, at - (think.readyAt - FLASH_THINK_MS)]
    setTaps(nextTaps)
    if (flashRushing(nextTaps)) setPause({ at, reason: 'focus' })
  }

  const markKnown = (at: number) => {
    if (!think.ready) return
    setKnown((k) => [...k, deck[index]])
    tapped(at)
    advance()
  }

  const skip = (at: number) => {
    const char = deck[index]
    if (mode === 'voice') {
      setRecords((r) => [...r, { char, result: 'skipped' }])
      ignoreBefore.current = mic.current?.now() ?? 0
      advance()
      return
    }
    if (!think.ready) return
    setUnknown((u) => [...u, char])
    tapped(at)
    advance()
  }

  const resumeFromFocus = () => {
    resumeTimer()
    setTaps([])
  }

  // ---------- 结束 ----------

  const finishTap = async () => {
    const answers = [
      ...known.map((c) => ({ char: c, correct: !misread.has(c), learned: learned.has(c) })),
      ...unknown.map((c) => ({ char: c, correct: false, learned: learned.has(c) })),
    ]
    const score = answers.filter((a) => a.correct).length
    setNeedPractice([...misread, ...unknown])
    setOutcome(await recordRound({ activity: 'flash', level, score, answers }))
    setPhase('done')
    if (reviewChars) void completeTask('review')
  }

  const finishVoice = async () => {
    const result = scoreFlash(records, learned)
    setNeedPractice(result.needPractice)
    setOutcome(await recordRound({ activity: 'flash', level, score: result.score, answers: result.answers }))
    setPhase('done')
    if (reviewChars) void completeTask('review')
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
    const score = mode === 'voice' ? scoreFlash(records, learned).score : known.length - misread.size
    return (
      <div className="page">
        {header}
        {phase === 'done' && outcome ? (
          <>
            <RoundSummary title="时间到！" score={score} unit="个字" outcome={outcome} onAgain={() => void start(mode)} />
            {needPractice.length > 0 && (
              <section className="card practice-list" aria-label="需要多练的字">
                <h3>
                  <PinyinText text="需要多练的字" />
                </h3>
                <div className="chip-row">
                  {needPractice.map((c) => (
                    <span key={c} className="practice-char">
                      <span className="slot-py">{ds.chars[c]?.py[0]}</span>
                      {c}
                    </span>
                  ))}
                </div>
              </section>
            )}
            {reviewChars && (
              <div className="option-row">
                <Link className="btn btn-primary big-btn" to="/">
                  <PinyinText text="回到今日任务" />
                </Link>
              </div>
            )}
          </>
        ) : (
          <section className="card game-intro">
            <p className="intro-text">
              <PinyinText
                text={`在 ${FLASH_SECONDS[stat.level]} 秒内大声读出尽量多的字。用声音闯关时，读完会马上听到自己读的和标准读音，一样就继续，不一样就再读一遍。`}
                speak
              />
            </p>
            {reviewChars && (
              <p className="notice" data-testid="flash-task">
                <PinyinText text={`今日任务：复习本课的 ${reviewChars.length} 个字`} />
              </p>
            )}
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
    // 声音模式已经逐个对照过，直接出成绩
    if (mode === 'voice') {
      return (
        <div className="page">
          {header}
          <section className="card review-card">
            <h2>
              <PinyinText text="时间到！" />
            </h2>
            <button type="button" className="btn btn-primary big-btn" onClick={() => void finishVoice()}>
              <PinyinText text="看成绩" />
            </button>
          </section>
        </div>
      )
    }
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
          <button type="button" className="btn btn-primary big-btn" onClick={finishTap}>
            <PinyinText text="完成，看成绩" />
          </button>
        </section>
      </div>
    )
  }

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const readCount = mode === 'voice' ? records.filter((r) => r.result !== 'skipped').length : known.length
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
          {left} 秒 · 已读 {readCount} 个
        </span>
      </div>
      <section className="card flash-card">
        {check ? (
          <div className="check-panel" data-testid="check-panel">
            <KaiChar char={check.char} size={160} />
            <div className="pinyin-big">{ds.chars[check.char]?.py[0]}</div>
            {check.gaveUp ? (
              <p className="check-title">
                <PinyinText text={`没关系，记住它：${ds.chars[check.char]?.py[0] ?? ''}`} />
              </p>
            ) : (
              <>
                <p className="check-title">
                  <PinyinText text={check.playing ? '听一听：先是你读的，再是标准读音' : '你读的和标准读音一样吗？'} />
                </p>
                <div className="option-row">
                  <button type="button" className="btn" disabled={check.playing} onClick={() => replay('mine')}>
                    <PinyinText text="▶ 我读的" />
                  </button>
                  <button type="button" className="btn" disabled={check.playing} onClick={() => replay('standard')}>
                    <PinyinText text="🔊 标准读音" />
                  </button>
                </div>
                <div className="option-row">
                  <button type="button" className="btn btn-primary big-btn" disabled={check.playing} onClick={() => judge('same')}>
                    <PinyinText text="✓ 一样" />
                  </button>
                  <button type="button" className="btn big-btn" disabled={check.playing} onClick={() => judge('different')}>
                    <PinyinText text="✗ 不一样" />
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {retryHint && (
              <p className="retry-hint" role="status">
                <PinyinText text={retryHint} />
              </p>
            )}
            <KaiChar char={deck[index]} size={220} />
            {mode === 'voice' ? (
              <>
                <div
                  className="mic-meter"
                  data-speaking={pause === null && listening.speaking}
                  data-testid="mic-meter"
                  aria-label={pause !== null ? '先听一听' : listening.speaking ? '正在听你读' : '等你读'}
                >
                  <span className="mic-dot" aria-hidden="true">
                    🎤
                  </span>
                  <span className="mic-bar">
                    <span style={{ width: `${pause === null ? Math.min(100, listening.level * 400) : 0}%` }} />
                  </span>
                  {/* 播放标准读音时还没开始听，不显示上一次的“正在听” */}
                  <PinyinText text={pause !== null ? '先听一听…' : listening.speaking ? '正在听…' : '大声读出来'} />
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
          </>
        )}
      </section>
      {pause?.reason === 'focus' && <FocusBreak message="要大声读出来再点哦" onResume={resumeFromFocus} />}
    </div>
  )
}
