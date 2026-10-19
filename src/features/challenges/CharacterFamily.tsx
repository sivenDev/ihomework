import { useRef, useState, type PointerEvent, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { PinyinText } from '../../components/PinyinText'
import { getSpeaker } from '../../lib/speech'
import { KaiChar } from '../handwriting/KaiChar'
import { FocusBreak } from './FocusBreak'
import { LEVEL_NAMES } from './logic/difficulty'
import { familyPuzzle, poolForLevel, type FamilyPuzzle } from './logic/generators'
import { RoundSummary } from './RoundSummary'
import { recordRound, saveFamily, useChallengeStat, useFamilyCollection, type RoundOutcome } from './store'
import { useChallenge } from './useChallenge'
import './challenges.css'

/** 连续放错几次偏旁就提醒（F002） */
const WRONG_STREAK = 3

/** 可以拖到中心、也可以直接点的偏旁卡。 */
function RadicalCard({
  label,
  used,
  shaking,
  onPlace,
  dropTarget,
}: {
  label: string
  used: boolean
  shaking: boolean
  onPlace: () => void
  dropTarget: RefObject<HTMLDivElement | null>
}) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    start.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (start.current) setOffset({ x: e.clientX - start.current.x, y: e.clientY - start.current.y })
  }
  const up = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current
    start.current = null
    setOffset({ x: 0, y: 0 })
    if (!s) return
    const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y)
    const rect = dropTarget.current?.getBoundingClientRect()
    const overCenter = rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom
    // 轻点或拖到中心都算放上去
    if (moved < 10 || overCenter) onPlace()
  }

  return (
    <button
      type="button"
      className="btn radical-card"
      data-shaking={shaking}
      disabled={used}
      aria-label={`偏旁 ${label}`}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        start.current = null
        setOffset({ x: 0, y: 0 })
      }}
    >
      {label}
    </button>
  )
}

/** 字族网络：一个声旁，配上不同的偏旁，组成一串读音相近的字。 */
export function CharacterFamily() {
  const ctx = useChallenge()
  const stat = useChallengeStat('family')
  // 拼过的字族只在后台记录，用来优先出新的字族（F004：不再显示收藏页）
  const collection = useFamilyCollection()
  const center = useRef<HTMLDivElement>(null)
  const [puzzle, setPuzzle] = useState<{ level: number; data: FamilyPuzzle | null } | null>(null)
  const [found, setFound] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [wrongStreak, setWrongStreak] = useState(0)
  const [shake, setShake] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)

  if (!ctx || !stat || !collection) return <div className="page muted">正在加载…</div>
  const { ds, progress, learned } = ctx

  const start = () => {
    const collected = new Set(collection.map((c) => c.phonetic))
    let data: FamilyPuzzle | null = null
    for (let lv = stat.level; lv <= 5 && !data; lv++) data = familyPuzzle(ds, poolForLevel(ds, progress, lv), collected)
    setPuzzle({ level: stat.level, data })
    setFound([])
    setMistakes(0)
    setWrongStreak(0)
    setOutcome(null)
  }

  const header = (
    <div className="topbar">
      <h1>🕸️ 字族网络</h1>
      <Link className="btn btn-quiet" to="/">
        <PinyinText text="回首页" />
      </Link>
    </div>
  )

  if (!progress) return <div className="page">{header}<p className="card">请家长先在“课本与字库”里设置当前学到的课。</p></div>

  if (!puzzle || outcome) {
    return (
      <div className="page">
        {header}
        {outcome && puzzle?.data ? (
          <>
            <FamilyMap phonetic={puzzle.data.phonetic} chars={found} />
            <RoundSummary title="字族导图完成！" score={found.length} unit="个字" outcome={outcome} onAgain={start} />
          </>
        ) : (
          <section className="card game-intro">
            <p className="intro-text">
              <PinyinText text="中间是一个声旁。把偏旁卡拖到它旁边（或者点一下），看看能组成哪些字——它们的读音都差不多！" speak />
            </p>
            <p className="muted">
              难度 {stat.level}：{LEVEL_NAMES[stat.level]}
            </p>
            <button type="button" className="btn btn-primary big-btn" onClick={start}>
              <PinyinText text="开始" />
            </button>
          </section>
        )}
      </div>
    )
  }

  if (!puzzle.data) {
    return (
      <div className="page">
        {header}
        <p className="card">
          <PinyinText text="这个范围里还没有能组成字族的字，过几课再来吧！" />
        </p>
      </div>
    )
  }

  const p = puzzle.data
  const place = async (radical: string) => {
    const target = p.targets.find((t) => t.radical === radical && !found.includes(t.char))
    if (!target) {
      setMistakes((m) => m + 1)
      setWrongStreak((n) => n + 1)
      setShake(radical)
      window.setTimeout(() => setShake(null), 500)
      return
    }
    setWrongStreak(0)
    getSpeaker().speak(target.char)
    const all = [...found, target.char]
    setFound(all)
    if (all.length === p.targets.length) {
      await saveFamily(p.phonetic, all)
      const answers = all.map((c) => ({ char: c, correct: true, learned: learned.has(c) }))
      const wrong = Array.from({ length: mistakes }, () => ({ char: p.phonetic, correct: false, learned: false }))
      setOutcome(await recordRound({ activity: 'family', level: puzzle.level, score: all.length, answers: [...answers, ...wrong] }))
    }
  }

  return (
    <div className="page">
      {header}
      <p className="muted game-progress">
        找到 {found.length} / {p.targets.length} 个字 · 难度 {puzzle.level}
      </p>
      <section className="card family-board">
        <div className="family-ring">
          {p.targets.map((t) => {
            const done = found.includes(t.char)
            const info = ds.chars[t.char]
            return (
              <div key={t.char} className="family-slot" data-found={done}>
                {done ? (
                  <>
                    <span className="slot-py">{info?.py[0]}</span>
                    <span className="slot-char" data-testid="found-char">
                      {t.char}
                    </span>
                    <span className="slot-word">{info?.words[0]}</span>
                  </>
                ) : (
                  <span className="slot-empty">？</span>
                )}
              </div>
            )
          })}
        </div>
        <div className="family-center" ref={center} aria-label={`声旁 ${p.phonetic}`} data-testid="family-center">
          <KaiChar char={p.phonetic} size={120} />
          {p.phoneticReading && <span className="slot-py">{p.phoneticReading}</span>}
        </div>
        <p className="tray-hint">
          <PinyinText text="把偏旁拖到中间，或者点一下" />
        </p>
        <div className="radical-tray">
          {p.radicalOptions.map((r) => (
            <RadicalCard
              key={r}
              label={r}
              used={p.targets.some((t) => t.radical === r && found.includes(t.char))}
              shaking={shake === r}
              dropTarget={center}
              onPlace={() => void place(r)}
            />
          ))}
        </div>
      </section>
      {wrongStreak >= WRONG_STREAK && (
        <FocusBreak
          message="慢一点，想一想再放哦"
          hint={`中间的字读 ${p.phoneticReading ?? ''}，找一找哪个偏旁和它组成你认识的字。`}
          onResume={() => setWrongStreak(0)}
        />
      )}
    </div>
  )
}

function FamilyMap({ phonetic, chars }: { phonetic: string; chars: string[] }) {
  return (
    <section className="card family-map" aria-label={`字族导图 ${phonetic}`}>
      <div className="map-center">{phonetic}</div>
      <div className="map-members">
        {chars.map((c) => (
          <span key={c} className="map-member">
            {c}
          </span>
        ))}
      </div>
    </section>
  )
}
