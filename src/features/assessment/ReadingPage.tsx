import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { updateRun } from './store'
import { useAssessment } from './useAssessment'
import './assessment.css'

const HAN = /\p{Script=Han}/gu

export function ReadingPage() {
  const ctx = useAssessment()
  const saved = ctx?.run.data.parts.reading
  const [text, setText] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [stalls, setStalls] = useState(0)

  useEffect(() => {
    if (startedAt === null) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [startedAt])

  if (!ctx) return <div className="page muted">正在加载…</div>
  const { run } = ctx
  const current = text ?? saved?.text ?? ''
  const hanCount = current.match(HAN)?.length ?? 0
  const running = startedAt !== null
  const elapsed = running ? Math.round((now - startedAt) / 1000) : 0

  const start = async () => {
    // 点击的那一刻开始计时，保存数据的耗时不计入
    const t = Date.now()
    setStalls(0)
    setNow(t)
    setStartedAt(t)
    await updateRun(run.id, (d) => ({ ...d, parts: { ...d.parts, reading: { text: current, seconds: 0, stalls: 0, done: false } } }))
  }

  const stop = async () => {
    const seconds = Math.max(1, Math.round((Date.now() - startedAt!) / 1000))
    setStartedAt(null)
    await updateRun(run.id, (d) => ({ ...d, parts: { ...d.parts, reading: { text: current, seconds, stalls, done: true } } }))
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>朗读计时</h1>
        <Link className="btn btn-quiet" to="/parent/assessment">
          返回
        </Link>
      </div>
      <section className="card reading-card">
        <label className="field">
          <span>粘贴一段孩子没学过的短文（300 字左右）</span>
          <textarea
            value={current}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            disabled={running}
            aria-label="朗读短文"
          />
        </label>
        <p className="muted">共 {hanCount} 个汉字</p>
        {running ? (
          <div className="reading-run">
            <div className="timer" data-testid="reading-timer">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            </div>
            <button type="button" className="btn" onClick={() => setStalls((n) => n + 1)}>
              卡顿 +1（{stalls}）
            </button>
            <button type="button" className="btn btn-primary" onClick={stop}>
              读完了，停止计时
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-primary" disabled={hanCount === 0} onClick={start}>
            {saved?.done ? '重新计时' : '开始计时'}
          </button>
        )}
        {saved?.done && !running && (
          <p className="reading-result" role="status">
            用时 {saved.seconds} 秒，卡顿 {saved.stalls} 次，每分钟约 {Math.round(((saved.text.match(HAN)?.length ?? 0) / saved.seconds) * 60)} 字。
          </p>
        )}
      </section>
    </div>
  )
}
