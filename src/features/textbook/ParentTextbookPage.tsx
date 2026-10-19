import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../app/useSettings'
import type { BookId, Dataset, Lesson } from '../../data/types'
import { updateSettings } from '../../db/settings'
import { addMistakes } from '../boss/api'
import { addShizi, addXiezi, removeShizi, removeXiezi, updateChar } from './edits'
import { currentLesson } from './logic/scope'
import { useCharEdits, useDataset } from './useDataset'
import './textbook.css'

const CN = '一二三四五六七八'

function lessonLabel(lesson: Lesson): string {
  if (lesson.kind === '语文园地') return '园地'
  if (lesson.kind === '汉语拼音') return `拼音 ${lesson.num}`
  return `${lesson.kind} ${lesson.num}`
}

function CharEditor({
  ds,
  lesson,
  char,
  verified,
  onClose,
}: {
  ds: Dataset
  lesson: Lesson
  char: string
  verified: boolean
  onClose: () => void
}) {
  const info = ds.chars[char]
  const [py, setPy] = useState(info?.py[0] ?? '')
  const [words, setWords] = useState((info?.words ?? []).join('、'))
  const [bossAdded, setBossAdded] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // 新版 Chrome 的 scrollIntoView 会返回 Promise，不能直接作为 effect 的返回值
    void panel.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [])
  const inShizi = lesson.shizi.some((r) => r.char === char)
  const inXiezi = lesson.xiezi.includes(char)

  const save = async () => {
    await updateChar(char, {
      py: py.trim() || undefined,
      words: words
        .split(/[、,，\s]+/)
        .map((w) => w.trim())
        .filter(Boolean),
    })
    onClose()
  }

  return (
    <div ref={panel} className="char-editor card" role="dialog" aria-label={`修改“${char}”`}>
      <div className="char-editor-head">
        <span className="char-editor-char">{char}</span>
        <div className="muted">
          {info ? `${info.radical}部 · ${info.strokes} 画 · ${info.structure}结构 · ${info.formation}字` : '新添加的字'}
        </div>
      </div>
      <label className="field">
        <span>读音</span>
        <input value={py} onChange={(e) => setPy(e.target.value)} aria-label="读音" />
      </label>
      <label className="field">
        <span>组词（用顿号分隔）</span>
        <input value={words} onChange={(e) => setWords(e.target.value)} aria-label="组词" />
      </label>
      <div className="button-row">
        <button type="button" className="btn btn-primary" onClick={save}>
          保存
        </button>
        <button
          type="button"
          className="btn"
          aria-pressed={verified}
          onClick={() => updateChar(char, { verified: !verified })}
        >
          {verified ? '已核对 ✓' : '标为已核对'}
        </button>
        <button
          type="button"
          className="btn"
          disabled={bossAdded}
          onClick={() => addMistakes([char], 'parent').then(() => setBossAdded(true))}
        >
          {bossAdded ? '已加入错字 Boss' : '加入错字 Boss'}
        </button>
        {inShizi && (
          <button type="button" className="btn btn-quiet" onClick={() => removeShizi(lesson.id, char).then(onClose)}>
            移出识字表
          </button>
        )}
        {inXiezi && (
          <button type="button" className="btn btn-quiet" onClick={() => removeXiezi(lesson.id, char).then(onClose)}>
            移出写字表
          </button>
        )}
        <button type="button" className="btn btn-quiet" onClick={onClose}>
          取消
        </button>
      </div>
    </div>
  )
}

function AddCharForm({ lesson }: { lesson: Lesson }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (target: 'shizi' | 'xiezi') => {
    const m = /^\s*(\p{Script=Han})\s*([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]*)\s*$/u.exec(text)
    if (!m) {
      setError('请输入一个汉字，可以在后面加拼音，例如：晴 qíng')
      return
    }
    setError(null)
    if (target === 'shizi') await addShizi(lesson.id, { char: m[1], py: m[2] || '' })
    else await addXiezi(lesson.id, m[1])
    setText('')
  }

  return (
    <div className="add-form">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="汉字 拼音，例如：晴 qíng"
        aria-label={`给${lesson.title}添加字`}
      />
      <button type="button" className="btn" onClick={() => submit('shizi')}>
        加入识字表
      </button>
      <button type="button" className="btn" onClick={() => submit('xiezi')}>
        加入写字表
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function LessonDetail({ ds, lesson, verifiedSet }: { ds: Dataset; lesson: Lesson; verifiedSet: Set<string> }) {
  const [editing, setEditing] = useState<string | null>(null)
  const chip = (char: string, py?: string) => (
    <button
      type="button"
      key={char}
      className="char-chip"
      data-verified={verifiedSet.has(char)}
      aria-label={`${char}${py ? ` ${py}` : ''}${verifiedSet.has(char) ? '，已核对' : ''}`}
      onClick={() => setEditing(char)}
    >
      {py && <span className="char-chip-py">{py}</span>}
      <span className="char-chip-char">{char}</span>
    </button>
  )

  return (
    <div className="lesson-detail">
      <h4>识字表</h4>
      <div className="chip-row">
        {lesson.shizi.length ? lesson.shizi.map((r) => chip(r.char, ds.chars[r.char]?.py[0] ?? r.py)) : <span className="muted">无</span>}
      </div>
      {lesson.duoyin.length > 0 && (
        <>
          <h4>多音字（不计入生字）</h4>
          <div className="chip-row">{lesson.duoyin.map((r) => chip(r.char, r.py))}</div>
        </>
      )}
      <h4>写字表</h4>
      <div className="chip-row">
        {lesson.xiezi.length ? lesson.xiezi.map((c) => chip(c)) : <span className="muted">无</span>}
      </div>
      <AddCharForm lesson={lesson} />
      {editing && (
        <CharEditor
          key={editing}
          ds={ds}
          lesson={lesson}
          char={editing}
          verified={verifiedSet.has(editing)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

export function ParentTextbookPage() {
  const ds = useDataset()
  const settings = useSettings()
  const charEdits = useCharEdits()
  const progress = settings?.progressLessonId ? { lessonId: settings.progressLessonId } : null
  const current = ds ? currentLesson(ds.books, progress) : undefined
  const [bookId, setBookId] = useState<BookId | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  if (!ds || !settings) return <div className="page muted">正在加载字库…</div>

  const book = ds.books.find((b) => b.id === (bookId ?? current?.book ?? 'g1a'))!
  const verifiedSet = new Set([...charEdits.values()].filter((e) => e.verified).map((e) => e.char))
  const units = [...new Set(book.lessons.map((l) => l.unit))]

  return (
    <div className="page">
      <div className="topbar">
        <h1>课本与字库</h1>
        <Link className="btn btn-quiet" to="/parent">
          返回家长模式
        </Link>
      </div>

      <section className="card progress-card" aria-label="当前进度">
        <div>
          <div className="muted">当前进度</div>
          <div className="progress-current" data-testid="current-progress">
            {current
              ? `${ds.books.find((b) => b.id === current.book)!.name} · ${lessonLabel(current)} ${current.title}`
              : '还没设置，请在下面的课程中点“设为当前”'}
          </div>
        </div>
        <button
          type="button"
          className="btn"
          aria-pressed={settings.allowAhead}
          onClick={() => updateSettings({ allowAhead: !settings.allowAhead })}
        >
          允许超前学习后续课程
        </button>
      </section>

      <div className="segmented book-tabs" role="tablist" aria-label="册">
        {ds.books.map((b) => (
          <button
            type="button"
            role="tab"
            key={b.id}
            className="btn"
            aria-selected={b.id === book.id}
            aria-pressed={b.id === book.id}
            onClick={() => setBookId(b.id)}
          >
            {b.name}
          </button>
        ))}
      </div>

      {units.map((unit) => (
        <section key={unit} className="unit" aria-label={`第${CN[unit - 1]}单元`}>
          <h2 className="unit-title">第{CN[unit - 1]}单元</h2>
          <ul className="lesson-list">
            {book.lessons
              .filter((l) => l.unit === unit)
              .map((lesson) => {
                const isCurrent = lesson.id === current?.id
                const checked = lesson.shizi.filter((r) => verifiedSet.has(r.char)).length
                return (
                  <li key={lesson.id} className="card lesson-row" data-current={isCurrent}>
                    <div className="lesson-head">
                      <span className="lesson-label">{lessonLabel(lesson)}</span>
                      <span className="lesson-title">{lesson.title}</span>
                      <span className="muted">
                        生字 {lesson.shizi.length} · 写字 {lesson.xiezi.length}
                        {lesson.shizi.length > 0 && ` · 已核对 ${checked}/${lesson.shizi.length}`}
                      </span>
                      <span className="lesson-actions">
                        <button
                          type="button"
                          className="btn"
                          aria-pressed={isCurrent}
                          aria-label={`把“${lesson.title}”设为当前进度`}
                          onClick={() => updateSettings({ progressLessonId: lesson.id })}
                        >
                          {isCurrent ? '当前进度' : '设为当前'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-quiet"
                          aria-expanded={expanded === lesson.id}
                          aria-label={`查看“${lesson.title}”的字`}
                          onClick={() => setExpanded(expanded === lesson.id ? null : lesson.id)}
                        >
                          {expanded === lesson.id ? '收起' : '查看'}
                        </button>
                      </span>
                    </div>
                    {expanded === lesson.id && <LessonDetail ds={ds} lesson={lesson} verifiedSet={verifiedSet} />}
                  </li>
                )
              })}
          </ul>
        </section>
      ))}
    </div>
  )
}
