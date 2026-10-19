import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../app/useSettings'
import { PinyinText } from '../../components/PinyinText'
import { localDate } from '../../lib/date'
import { getSpeaker } from '../../lib/speech'
import { HanziBoard } from '../handwriting/HanziBoard'
import { KaiChar } from '../handwriting/KaiChar'
import { learnedXiezi } from '../textbook/logic/scope'
import { useDataset } from '../textbook/useDataset'
import { addMistakes, answerCard, useBossCards } from './api'
import { dueCards, isCheck, isMastered } from './logic/scheduler'
import './boss.css'

type Step = 'read' | 'check' | 'write' | 'result'

/** 错字 Boss 战：今天到期的错字，先认读，需要会写的字再默写。 */
export function BossBattlePage() {
  const cards = useBossCards()
  const ds = useDataset()
  const settings = useSettings()
  const today = localDate()
  // 进入页面时确定今天的 Boss 名单，答完一个减一格血
  const [roster, setRoster] = useState<string[] | null>(null)
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<Step>('read')
  const [won, setWon] = useState<boolean | null>(null)

  const writeSet = useMemo(() => {
    if (!ds || !settings) return new Set<string>()
    const progress = settings.progressLessonId ? { lessonId: settings.progressLessonId } : null
    return new Set(learnedXiezi(ds.books, progress))
  }, [ds, settings])

  if (!cards || !ds || !settings) return <div className="page muted">正在加载…</div>
  const list = roster ?? dueCards(cards, today).map((c) => c.char)
  if (!roster && list.length) setRoster(list)

  const mastered = cards.filter(isMastered).map((c) => c.char)
  const checking = cards.filter(isCheck).map((c) => c.char)
  const char = list[index]
  const card = cards.find((c) => c.char === char)
  const remaining = list.length - index
  const info = char ? ds.chars[char] : undefined
  const word = info?.words.find((w) => w.length === 2) ?? char

  const settle = async (correct: boolean) => {
    setWon(correct)
    setStep('result')
    await answerCard(char, correct, today)
  }

  const next = () => {
    setIndex((i) => i + 1)
    setStep('read')
    setWon(null)
  }

  const reveal = () => {
    getSpeaker().speak(char)
  }

  return (
    <div className="page boss-page">
      <div className="topbar">
        <h1>错字 Boss</h1>
        <Link className="btn btn-quiet" to="/">
          <PinyinText text="回首页" />
        </Link>
      </div>

      {list.length === 0 || index >= list.length ? (
        <section className="card boss-done">
          <div className="boss-emoji" aria-hidden="true">
            {list.length ? '🏆' : '😴'}
          </div>
          <h2>
            <PinyinText text={list.length ? '今天的 Boss 被你打败了！' : '今天没有要打的 Boss'} />
          </h2>
          <p className="muted">
            <PinyinText text="错字会在第 1、2、4 天回来找你，连续答对 3 次就能打败它；打败后第 7 天、第 15 天还会回来复查，都答对就彻底记住了。" />
          </p>
          <TrophyShelf mastered={mastered} checking={checking} />
        </section>
      ) : (
        <>
          <div className="boss-hp" aria-label={`Boss 剩余血量 ${remaining}`}>
            <span className="boss-emoji" aria-hidden="true">
              🐉
            </span>
            <div className="hp-bar">
              <div className="hp-fill" style={{ width: `${(remaining / list.length) * 100}%` }} />
            </div>
            <span className="hp-text" data-testid="boss-remaining">
              还剩 {remaining} 个
            </span>
          </div>

          <section className="card boss-card">
            {card && isCheck(card) && step !== 'result' && (
              <span className="check-badge" data-testid="check-badge">
                <PinyinText text="复查：打败过的字，看看还记得吗" />
              </span>
            )}
            {step === 'read' && (
              <>
                <p className="prompt">
                  <PinyinText text="这个字怎么读？" speak />
                </p>
                <KaiChar char={char} size={200} />
                <div className="mark-row">
                  <button
                    type="button"
                    className="btn btn-primary big-btn"
                    onClick={() => {
                      reveal()
                      setStep('check')
                    }}
                  >
                    <PinyinText text="我会读" />
                  </button>
                  <button
                    type="button"
                    className="btn big-btn"
                    onClick={() => {
                      reveal()
                      void settle(false)
                    }}
                  >
                    <PinyinText text="不认识" />
                  </button>
                </div>
              </>
            )}

            {step === 'check' && (
              <>
                <div className="pinyin-big">{info?.py[0]}</div>
                <KaiChar char={char} size={200} />
                <p className="prompt">
                  <PinyinText text="听一听，你读对了吗？" />
                </p>
                <div className="mark-row">
                  <button
                    type="button"
                    className="btn btn-primary big-btn"
                    onClick={() => (writeSet.has(char) ? setStep('write') : void settle(true))}
                  >
                    <PinyinText text="读对了" />
                  </button>
                  <button type="button" className="btn big-btn" onClick={() => void settle(false)}>
                    <PinyinText text="读错了" />
                  </button>
                </div>
              </>
            )}

            {step === 'write' && (
              <>
                <p className="write-prompt">
                  <PinyinText text="写一写：" />
                  <strong>{info?.py[0]}</strong>（{word}）
                  <button type="button" className="btn btn-quiet" onClick={() => getSpeaker().speak(word === char ? char : `${char}，${word}的${char}`)}>
                    🔊
                  </button>
                </p>
                <HanziBoard
                  key={`${char}-boss`}
                  char={char}
                  mode="dictation"
                  size={300}
                  onDone={(r) => {
                    if (r !== 'correct') void addMistakes([char], 'dictation', today)
                    void settle(r === 'correct')
                  }}
                />
              </>
            )}

            {step === 'result' && (
              <div className="boss-result" role="status">
                <div className="boss-emoji" aria-hidden="true">
                  {won ? '⚔️' : '💪'}
                </div>
                <h2>
                  <PinyinText text={won ? '打中了！' : '没关系，明天再来打它'} />
                </h2>
                <div className="pinyin-big">{info?.py[0]}</div>
                <KaiChar char={char} size={140} />
                <button type="button" className="btn btn-primary big-btn" onClick={next}>
                  <PinyinText text={remaining > 1 ? '下一个' : '完成'} />
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function TrophyShelf({ mastered, checking }: { mastered: string[]; checking: string[] }) {
  if (!mastered.length && !checking.length) return null
  return (
    <div className="trophies">
      <h3>
        <PinyinText text="战利品" />
      </h3>
      {mastered.length > 0 && (
        <>
          <p className="muted">已牢记 {mastered.length} 个</p>
          <div className="chip-row" data-testid="mastered">
            {mastered.map((c) => (
              <span key={c} className="trophy trophy-mastered">
                {c}
              </span>
            ))}
          </div>
        </>
      )}
      {checking.length > 0 && (
        <>
          <p className="muted">已打败、等待复查 {checking.length} 个</p>
          <div className="chip-row" data-testid="checking">
            {checking.map((c) => (
              <span key={c} className="trophy">
                {c}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
