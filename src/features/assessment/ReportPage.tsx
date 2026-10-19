import { Link, useParams } from 'react-router-dom'
import { RUBRIC_ITEMS, WRITING_LEVELS, type Report } from './logic/types'
import { useFinishedRuns, useRun } from './store'
import { useDataset } from '../textbook/useDataset'
import './assessment.css'

const pct = (x: number) => `${Math.round(x * 100)}%`

const FOCUS_TEXT: Record<Report['focus'], string> = {
  识字: '优先补识字：认读正确率低于 75%，先把学过的字认牢。',
  写作: '优先补写作：认字已经不错，写作还有提升空间。',
  并行: '识字和写作并行提高。',
}

const ROUTE_TEXT: Record<Report['route'], string> = {
  补漏: '补漏路线：每天从待攻克清单里补几个字，追上学校进度。',
  同步: '同步路线：跟着课本预习、复习当前内容。',
  拓展: '拓展路线：课内已经掌握，可以超前学习和学课外常用字。',
}

function Delta({ now, before, unit = '' }: { now: number; before?: number; unit?: string }) {
  if (before === undefined) return null
  const d = now - before
  if (d === 0) return <span className="delta">与上次持平</span>
  return (
    <span className={`delta ${d > 0 ? 'delta-up' : 'delta-down'}`}>
      比上次{d > 0 ? '多' : '少'} {Math.abs(Math.round(d))}
      {unit}
    </span>
  )
}

export function ReportPage() {
  const { id } = useParams()
  const run = useRun(Number(id))
  const finished = useFinishedRuns()
  const ds = useDataset()

  if (run === undefined || !finished || !ds) return <div className="page muted">正在加载…</div>
  const report = run?.data.report
  if (!report) return <div className="page">没有找到这份报告。<Link to="/parent/assessment">返回</Link></div>

  const previous = finished.find((r) => r.id < run!.id)?.data.report
  const lesson = ds.books.flatMap((b) => b.lessons).find((l) => l.id === report.progressLessonId)
  const bookName = (bookId: string) => ds.books.find((b) => b.id === bookId)?.name ?? bookId

  return (
    <div className="page">
      <div className="topbar">
        <h1>评估报告</h1>
        <Link className="btn btn-quiet" to="/parent/assessment">
          返回评估
        </Link>
      </div>
      <p className="muted">
        {report.date} · 当时进度：{lesson ? `${bookName(lesson.book)} ${lesson.title}` : report.progressLessonId}
        {previous && ` · 对比 ${previous.date} 的评估`}
      </p>

      <div className="report-grid">
        <section className="card stat" aria-label="课内识字量">
          <div className="stat-label">课内识字量</div>
          <div className="stat-value" data-testid="estimate">
            约 {report.recognition.estimate} 字
          </div>
          <div className="muted">
            已学 {report.recognition.learned} 字，认读正确率 {pct(report.recognition.accuracy)}
          </div>
          <Delta now={report.recognition.estimate} before={previous?.recognition.estimate} unit=" 字" />
          <ul className="per-book">
            {report.recognition.perBook.map((b) => (
              <li key={b.book}>
                {bookName(b.book)}：抽 {b.tested} 对 {b.correct}
              </li>
            ))}
          </ul>
        </section>

        {report.extension && (
          <section className="card stat" aria-label="课外识字量">
            <div className="stat-label">课外识字量</div>
            <div className="stat-value">约 {report.extension.estimate} 字</div>
            <div className="muted">测了 {report.extension.layersTested} 组常用字</div>
            <Delta now={report.extension.estimate} before={previous?.extension?.estimate} unit=" 字" />
          </section>
        )}

        {report.dictation && (
          <section className="card stat" aria-label="书写正确率">
            <div className="stat-label">书写正确率（听写）</div>
            <div className="stat-value">{pct(report.dictation.accuracy)}</div>
            <div className="muted">
              听写 {report.dictation.tested} 个，写对 {report.dictation.correct} 个
            </div>
            {previous?.dictation && <Delta now={report.dictation.accuracy * 100} before={previous.dictation.accuracy * 100} unit=" 个百分点" />}
          </section>
        )}

        {report.writing && (
          <section className="card stat" aria-label="写作">
            <div className="stat-label">看图写作</div>
            <div className="stat-value">
              {report.writing.total} / 15 分 · {report.writing.level} 级
            </div>
            <div className="muted">{WRITING_LEVELS[report.writing.level - 1].goal}</div>
            <div className="muted">{RUBRIC_ITEMS.map((i) => `${i.label} ${report.writing!.scores[i.key]}`).join(' · ')}</div>
          </section>
        )}

        {report.words && (
          <section className="card stat" aria-label="词汇">
            <div className="stat-label">组词与词语理解</div>
            <div className="stat-value">
              {report.words.charScore} / {report.words.charMax}
            </div>
            <div className="muted">
              词语理解 {report.words.wordsKnown} / {report.words.wordsTested}
            </div>
          </section>
        )}

        {report.reading && (
          <section className="card stat" aria-label="朗读">
            <div className="stat-label">朗读速度</div>
            <div className="stat-value">每分钟 {report.reading.charsPerMinute} 字</div>
            <div className="muted">卡顿 {report.reading.stalls} 次</div>
            <Delta now={report.reading.charsPerMinute} before={previous?.reading?.charsPerMinute} unit=" 字/分钟" />
          </section>
        )}
      </div>

      <section className="card suggestions" aria-label="建议">
        <h2>建议</h2>
        <ul>
          <li>
            <strong>补强方向：</strong>
            {FOCUS_TEXT[report.focus]}
          </li>
          <li data-testid="route">
            <strong>学习路线：</strong>
            {ROUTE_TEXT[report.route]}
          </li>
          <li data-testid="level">
            <strong>练习级别：</strong>
            建议“{report.level}”。{report.level === '标准' && '基础好的孩子想多学一些，也可以选“加强”。'}
          </li>
        </ul>
        <p className="muted">这些只是建议，具体在每日任务设置里由你决定。</p>
      </section>

      <section className="card" aria-label="待攻克清单">
        <h2>待攻克清单（{report.backlog.length} 个）</h2>
        <p className="muted">认读或听写出错的字，会进入错字 Boss 按间隔复习。</p>
        <div className="chip-row backlog">
          {report.backlog.map((c) => (
            <span key={c} className="backlog-char">
              {c}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
