import { useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { getSpeaker } from '../../lib/speech'
import { KaiChar } from '../handwriting/KaiChar'
import { LEVEL_NAMES } from './logic/difficulty'
import { familyPuzzle, poolForLevel, type FamilyPuzzle } from './logic/generators'
import { RoundSummary } from './RoundSummary'
import { recordRound, saveFamily, useChallengeStat, useFamilyCollection, type RoundOutcome } from './store'
import { useChallenge } from './useChallenge'
import './challenges.css'

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
  dropTarget: React.RefObject<HTMLDivElement | null>
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
  const collection = useFamilyCollection()
  const center = useRef<HTMLDivElement>(null)
  const [puzzle, setPuzzle] = useState<{ level: number; data: FamilyPuzzle | null } | null>(null)
  const [found, setFound] = useState<string[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [shake, setShake] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null)
  const [showCollection, setShowCollection] = useState(false)

  if (!ctx || !stat || !collection) return <div className="page muted">正在加载…</div>
  const { ds, progress, learned } = ctx

  const start = () => {
    const collected = new Set(collection.map((c) => c.phonetic))
    let data: FamilyPuzzle | null = null
    for (let lv = stat.level; lv <= 5 && !data; lv++) data = familyPuzzle(ds, poolForLevel(ds, progress, lv), collected)
    setPuzzle({ level: stat.level, data })
    setFound([])
    setMistakes(0)
    setOutcome(null)
  }

  const header = (
    <div className="topbar">
      <h1>🕸️ 字族网络</h1>
      <span className="button-row">
        <button type="button" className="btn btn-quiet" aria-pressed={showCollection} onClick={() => setShowCollection((v) => !v)}>
          我的收藏（{collection.length}）
        </button>
        <Link className="btn btn-quiet" to="/">
          回首页
        </Link>
      </span>
    </div>
  )

  if (showCollection) {
    return (
      <div className="page">
        {header}
        {collection.length === 0 ? (
          <p className="card">还没有收藏。完成一张字族导图就会收进来。</p>
        ) : (
          <div className="collection">
            {collection.map((f) => (
              <FamilyMap key={f.phonetic} phonetic={f.phonetic} chars={f.chars} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!progress) return <div className="page">{header}<p className="card">请家长先在“课本与字库”里设置当前学到的课。</p></div>

  if (!puzzle || outcome) {
    return (
      <div className="page">
        {header}
        {outcome && puzzle?.data ? (
          <>
            <FamilyMap phonetic={puzzle.data.phonetic} chars={found} />
            <RoundSummary title="字族导图完成，已收进“我的收藏”！" score={found.length} unit="个字" outcome={outcome} onAgain={start} />
          </>
        ) : (
          <section className="card game-intro">
            <p>
              中间是一个<strong>声旁</strong>。把偏旁卡拖到它旁边（或者点一下），看看能组成哪些字——它们的读音都差不多！
            </p>
            <p className="muted">
              难度 {stat.level}：{LEVEL_NAMES[stat.level]}
            </p>
            <button type="button" className="btn btn-primary big-btn" onClick={start}>
              开始
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
        <p className="card">这个范围里还没有能组成字族的字，过几课再来吧！</p>
      </div>
    )
  }

  const p = puzzle.data
  const place = async (radical: string) => {
    const target = p.targets.find((t) => t.radical === radical && !found.includes(t.char))
    if (!target) {
      setMistakes((m) => m + 1)
      setShake(radical)
      window.setTimeout(() => setShake(null), 500)
      return
    }
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
