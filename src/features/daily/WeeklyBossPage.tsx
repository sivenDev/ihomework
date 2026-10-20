import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PinyinText } from '../../components/PinyinText'
import { db, type ExamRow } from '../../db/schema'
import { getSpeaker } from '../../lib/speech'
import { addMistakes } from '../boss/api'
import { HanziBoard } from '../handwriting/HanziBoard'
import { KaiChar } from '../handwriting/KaiChar'
import { useDataset } from '../textbook/useDataset'
import { ensureWeeklyExam, finishExam } from './store'
import '../boss/boss.css'
import './daily.css'

type Step = 'read' | 'check' | 'write'

function Header({ title }: { title: string }) {
  return (
    <div className="topbar">
      <h1>{title}</h1>
      <Link className="btn btn-quiet" to="/">
        <PinyinText text="回首页" />
      </Link>
    </div>
  )
}

/** 周 Boss 战：每周六起可用，从本周学过的字中抽 20 个，认读 + 默写，和上周比一比。 */
export function WeeklyBossPage() {
  const ds = useDataset()
  const [id, setId] = useState<number | null | undefined>(undefined)
  useEffect(() => {
    if (ds) void ensureWeeklyExam(ds).then(setId)
  }, [ds])
  const exam = useLiveQuery(async () => (typeof id === 'number' ? ((await db.exams.get(id)) ?? null) : id), [id])
  const previous = useLiveQuery(
    async () =>
      exam
        ? (await db.exams.where('kind').equals('weekly').toArray()).filter((e) => e.status === 'done' && e.key < exam.key).sort((a, b) => a.key.localeCompare(b.key)).at(-1) ?? null
        : null,
    [exam?.key],
  )

  if (id === undefined || exam === undefined || previous === undefined) return <div className="page muted">正在加载…</div>
  if (!exam)
    return (
      <div className="page">
        <Header title="👹 周 Boss 战" />
        <p className="card">
          <PinyinText text="周 Boss 每周六开放，从这一周学过的字里出题。这周学几个新字再来吧！" />
        </p>
      </div>
    )
  return <ExamRunner exam={exam} previous={previous} title="👹 周 Boss 战" />
}

/** 单元挑战：家长把进度推进到新单元时，为刚结束的单元生成。 */
export function UnitChallengePage() {
  const { id } = useParams()
  const exam = useLiveQuery(async () => (await db.exams.get(Number(id))) ?? null, [id])
  if (exam === undefined) return <div className="page muted">正在加载…</div>
  if (!exam)
    return (
      <div className="page">
        <Header title="🏯 单元挑战" />
        <p className="card">没有找到这个挑战。</p>
      </div>
    )
  return <ExamRunner exam={exam} previous={null} title={`🏯 单元挑战 · ${exam.title}`} />
}

function ExamRunner({ exam, previous, title }: { exam: ExamRow; previous: ExamRow | null; title: string }) {
  const ds = useDataset()
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<Step>('read')
  const [results, setResults] = useState<Record<string, boolean>>({})

  if (!ds) return <div className="page muted">正在加载…</div>

  if (exam.status === 'done') {
    const accuracy = Math.round((exam.accuracy ?? 0) * 100)
    const before = previous?.accuracy !== undefined ? Math.round(previous.accuracy * 100) : null
    const wrong = Object.entries(exam.results ?? {})
      .filter(([, ok]) => !ok)
      .map(([c]) => c)
    return (
      <div className="page">
        <Header title={title} />
        <section className="card exam-result" role="status">
          <div className="summary-emoji" aria-hidden="true">
            {accuracy >= 90 ? '🏆' : accuracy >= 70 ? '🎉' : '💪'}
          </div>
          <div className="exam-accuracy" data-testid="exam-accuracy">
            {accuracy}%
          </div>
          {before !== null && (
            <p data-testid="exam-compare">
              <PinyinText
                text={
                  accuracy > before
                    ? `上周 ${before}%，这周进步了 ${accuracy - before}%！`
                    : accuracy === before
                      ? `和上周一样，都是 ${before}%。`
                      : `上周 ${before}%。这周的字更难一些，错的字会在错字 Boss 里再练。`
                }
              />
            </p>
          )}
          {wrong.length > 0 && (
            <p>
              <PinyinText text="要多练的字：" />
              <strong>{wrong.join(' ')}</strong>
            </p>
          )}
          <Link className="btn btn-primary big-btn" to="/">
            <PinyinText text="回到今日任务" />
          </Link>
        </section>
      </div>
    )
  }

  const char = exam.chars[index]
  const info = ds.chars[char]
  const word = info?.words.find((w) => w.length === 2) ?? char

  const record = async (correct: boolean) => {
    const all = { ...results, [char]: correct }
    setResults(all)
    if (index + 1 < exam.chars.length) {
      setIndex(index + 1)
      setStep('read')
      return
    }
    await addMistakes(
      Object.entries(all)
        .filter(([, ok]) => !ok)
        .map(([c]) => c),
      exam.kind,
    )
    await finishExam(exam.id!, all)
  }

  return (
    <div className="page boss-page">
      <Header title={title} />
      <div className="boss-hp" aria-label={`还剩 ${exam.chars.length - index} 个`}>
        <span className="boss-emoji" aria-hidden="true">
          👹
        </span>
        <div className="hp-bar">
          <div className="hp-fill" style={{ width: `${((exam.chars.length - index) / exam.chars.length) * 100}%` }} />
        </div>
        <span className="hp-text" data-testid="exam-progress">
          第 {index + 1} / {exam.chars.length} 个
        </span>
      </div>
      <section className="card boss-card">
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
                  getSpeaker().speak(char)
                  setStep('check')
                }}
              >
                <PinyinText text="我会读" />
              </button>
              <button type="button" className="btn big-btn" onClick={() => void record(false)}>
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
                onClick={() => (exam.write.includes(char) ? setStep('write') : void record(true))}
              >
                <PinyinText text="读对了" />
              </button>
              <button type="button" className="btn big-btn" onClick={() => void record(false)}>
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
            <HanziBoard key={`${char}-exam`} char={char} mode="dictation" size={300} onDone={(r) => void record(r === 'correct')} />
          </>
        )}
      </section>
    </div>
  )
}
