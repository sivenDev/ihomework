import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../app/useSettings'
import { BOOK_LEVELS, type BookLevel } from './booklist'
import { addBook, removeBook, restoreBuiltinBooks, useBookList } from './store'
import '../rewards/rewards.css'
import './reading.css'

/** 家长维护推荐书单：增删书目（只有书名和简介）。 */
export function ParentBooksPage() {
  const books = useBookList()
  const settings = useSettings()
  const [title, setTitle] = useState('')
  const [intro, setIntro] = useState('')
  const [level, setLevel] = useState<BookLevel>('入门')

  if (!books || !settings) return <div className="page muted">正在加载…</div>
  const valid = title.trim().length > 0

  return (
    <div className="page">
      <div className="topbar">
        <h1>推荐书单</h1>
        <Link className="btn btn-quiet" to="/parent">
          返回家长模式
        </Link>
      </div>

      <div className="parent-grid">
        <section className="card" aria-labelledby="add-book-title">
          <h2 id="add-book-title">添加一本书</h2>
          <form
            className="reward-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!valid) return
              void addBook(title, intro, level)
              setTitle('')
              setIntro('')
            }}
          >
            <label>
              书名
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} />
            </label>
            <label>
              简介（可选）
              <input value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={60} />
            </label>
            <div className="segmented" role="group" aria-label="难度">
              {BOOK_LEVELS.map((l) => (
                <button key={l.level} type="button" className="btn" aria-pressed={level === l.level} onClick={() => setLevel(l.level)}>
                  {l.level}
                </button>
              ))}
            </div>
            <button type="submit" className="btn btn-primary" disabled={!valid}>
              添加
            </button>
          </form>
          <p className="muted">书单只记书名和简介，不收录书的内容。</p>
          {settings.hiddenBooks.length > 0 && (
            <button type="button" className="btn btn-quiet" onClick={() => void restoreBuiltinBooks()}>
              恢复删掉的内置书目（{settings.hiddenBooks.length} 本）
            </button>
          )}
        </section>

        <section className="card" aria-labelledby="book-list-title">
          <h2 id="book-list-title">当前书单</h2>
          {BOOK_LEVELS.map(({ level: l, note }) => (
            <div key={l} className="book-group">
              <h3>
                {l} <span className="muted">{note}</span>
              </h3>
              <ul className="reward-list">
                {books
                  .filter((b) => b.level === l)
                  .map((b) => (
                    <li key={b.id} className="reward-item">
                      <span>
                        <span className="reward-name">《{b.title}》</span>
                        {b.intro && <span className="muted"> {b.intro}</span>}
                      </span>
                      <button type="button" className="btn btn-quiet" aria-label={`删除《${b.title}》`} onClick={() => void removeBook(b.id)}>
                        删除
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
