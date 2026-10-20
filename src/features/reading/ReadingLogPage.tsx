import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PinyinText } from '../../components/PinyinText'
import { localDate } from '../../lib/date'
import { useTaskParam } from '../daily/useDaily'
import { XP_RULES } from '../rewards/logic/xp'
import { BOOK_LEVELS, bookKey } from './booklist'
import { logReading, useBookList, useReadingLogs } from './store'
import './reading.css'

const MINUTE_OPTIONS = [5, 10, 15, 20, 30]

/** 阅读打卡：选书名和时长，一键完成；读完一本书得到奖励。下面是推荐书单。 */
export function ReadingLogPage() {
  const task = useTaskParam()
  const logs = useReadingLogs()
  const books = useBookList()
  const [title, setTitle] = useState('')
  const [minutes, setMinutes] = useState(15)
  const [finished, setFinished] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  if (!logs || !books) return <div className="page muted">正在加载…</div>
  const today = localDate()
  const todayLogs = logs.filter((l) => l.date === today)
  const recent = [...new Set(logs.filter((l) => !l.finished).map((l) => l.title))].slice(0, 4)
  const finishedBooks = new Set(logs.filter((l) => l.finished).map((l) => bookKey(l.title)))

  const submit = async () => {
    const xp = await logReading({ title, minutes, finished })
    setMessage(xp ? `打卡成功！读完一本书，经验值 +${xp}！` : '打卡成功！')
    setTitle('')
    setFinished(false)
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>📖 阅读打卡</h1>
        <Link className="btn btn-quiet" to="/">
          <PinyinText text={task ? '回到今日任务' : '回首页'} />
        </Link>
      </div>

      <section className="card reading-form" aria-label="打卡">
        <label className="reading-field">
          <span className="reading-label">
            <PinyinText text="今天读的书" />
          </span>
          <input className="text-input" list="book-titles" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="书名" placeholder="写书名，或者从下面选" maxLength={40} />
          <datalist id="book-titles">
            {books.map((b) => (
              <option key={b.id} value={b.title} />
            ))}
          </datalist>
        </label>
        {recent.length > 0 && (
          <div className="segmented" aria-label="最近在读">
            {recent.map((t) => (
              <button key={t} type="button" className="btn" aria-pressed={title === t} onClick={() => setTitle(t)}>
                {t}
              </button>
            ))}
          </div>
        )}

        <span className="reading-label">
          <PinyinText text="读了多久" />
        </span>
        <div className="segmented" role="group" aria-label="阅读时长">
          {MINUTE_OPTIONS.map((m) => (
            <button key={m} type="button" className="btn" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
              {m} 分钟
            </button>
          ))}
        </div>

        <button type="button" className="btn" aria-pressed={finished} onClick={() => setFinished(!finished)}>
          🏁 <PinyinText text={`这本书读完啦（+${XP_RULES.bookFinished} 经验值）`} />
        </button>

        <button type="button" className="btn btn-primary big-btn" disabled={!title.trim()} onClick={() => void submit()}>
          <PinyinText text="打卡" />
        </button>
        {message && (
          <p role="status" className="reading-message">
            🎉 <PinyinText text={message} />
          </p>
        )}
      </section>

      <section className="card reading-section" aria-labelledby="reading-log-title">
        <h2 id="reading-log-title">
          <PinyinText text="我的阅读" />
        </h2>
        <p className="muted" data-testid="reading-stats">
          <PinyinText text={`今天读了 ${todayLogs.reduce((n, l) => n + l.minutes, 0)} 分钟 · 一共读完 ${finishedBooks.size} 本书`} />
        </p>
        {logs.length > 0 && (
          <ul className="reading-log">
            {logs.slice(0, 10).map((l) => (
              <li key={l.id} data-testid="reading-log">
                {l.date} · 《{l.title}》 · {l.minutes} 分钟{l.finished && ' · 🏁 读完'}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card reading-section" aria-labelledby="booklist-title">
        <h2 id="booklist-title">
          <PinyinText text="推荐书单" />
        </h2>
        {BOOK_LEVELS.map(({ level, note }) => {
          const list = books.filter((b) => b.level === level)
          if (!list.length) return null
          return (
            <div key={level} className="book-group">
              <h3>
                <PinyinText text={level} /> <span className="muted">{note}</span>
              </h3>
              <ul className="book-list">
                {list.map((b) => (
                  <li key={b.id} className="book-item">
                    <span>
                      <strong>
                        <PinyinText text={`《${b.title}》`} />
                      </strong>
                      {finishedBooks.has(bookKey(b.title)) && ' 🏁'}
                      <br />
                      <span className="muted">
                        <PinyinText text={b.intro} />
                      </span>
                    </span>
                    <button type="button" className="btn" aria-label={`读《${b.title}》`} onClick={() => setTitle(b.title)}>
                      <PinyinText text="读这本" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>
    </div>
  )
}
