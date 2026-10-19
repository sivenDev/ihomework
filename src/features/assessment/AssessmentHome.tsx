import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSettings } from '../../app/useSettings'
import { currentLesson } from '../textbook/logic/scope'
import { useDataset } from '../textbook/useDataset'
import { canFinish, partStatus, type PartKey, type PartStatus } from './logic/progress'
import { createRun, discardRun, finishRun, useActiveRun, useFinishedRuns } from './store'
import './assessment.css'

const PARTS: { key: PartKey; title: string; note: string }[] = [
  { key: 'recognition', title: '课内认读', note: '一屏一个字，孩子读出来，你判断对错' },
  { key: 'extension', title: '拓展认读', note: '课内认读正确率达到 90% 才开放，测课外认识多少字' },
  { key: 'dictation', title: '听写', note: '系统读字词，孩子在纸上写，你标记结果' },
  { key: 'words', title: '组词与词语理解', note: '孩子口头组词、说词语的意思（可选）' },
  { key: 'reading', title: '朗读计时', note: '粘贴一段没学过的短文，计时读完（可选）' },
  { key: 'writing', title: '看图写作', note: '按评分表打分，选出当前写作等级（可选）' },
]

const STATUS_TEXT: Record<PartStatus, string> = { locked: '未开放', todo: '未开始', doing: '进行中', done: '已完成' }
const VERB: Record<PartStatus, string> = { locked: '', todo: '开始', doing: '继续', done: '查看' }
const SAMPLE_SIZES = [10, 20, 30, 40]

export function AssessmentHome() {
  const ds = useDataset()
  const settings = useSettings()
  const run = useActiveRun()
  const finished = useFinishedRuns()
  const navigate = useNavigate()
  const [sampleSize, setSampleSize] = useState(30)

  if (!ds || !settings || run === undefined || !finished) return <div className="page muted">正在加载…</div>

  const progress = settings.progressLessonId ? { lessonId: settings.progressLessonId } : null
  const lesson = currentLesson(ds.books, progress)

  return (
    <div className="page">
      <div className="topbar">
        <h1>现状评估</h1>
        <Link className="btn btn-quiet" to="/parent">
          返回家长模式
        </Link>
      </div>

      {!lesson ? (
        <section className="card">
          <p>开始评估前，请先在“课本与字库”里设置孩子当前学到的课，评估只考已经学过的字。</p>
          <Link className="btn btn-primary" to="/parent/textbook">
            去设置进度
          </Link>
        </section>
      ) : !run ? (
        <section className="card start-card">
          <h2>开始一次新评估</h2>
          <p className="muted">
            按当前进度（{ds.books.find((b) => b.id === lesson.book)!.name} · {lesson.title}）出题。可以分几次做完，每次不超过 20 分钟，中途退出会自动保存。
          </p>
          <div>
            <div className="muted">课内认读每册抽多少个字</div>
            <div className="segmented" role="group" aria-label="每册抽字数">
              {SAMPLE_SIZES.map((n) => (
                <button type="button" key={n} className="btn" aria-pressed={sampleSize === n} onClick={() => setSampleSize(n)}>
                  {n} 个
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => createRun(ds, lesson.id, sampleSize)}>
            开始评估
          </button>
        </section>
      ) : (
        <section aria-label="本次评估">
          <ul className="part-list">
            {PARTS.map((part) => {
              const status = partStatus(run.data, part.key)
              return (
                <li key={part.key} className="card part-card" data-status={status}>
                  <div>
                    <h2>{part.title}</h2>
                    <p className="muted">{part.note}</p>
                  </div>
                  <span className="part-status">{STATUS_TEXT[status]}</span>
                  {status !== 'locked' && (
                    <Link className="btn" to={`/parent/assessment/${part.key}`} aria-label={`${VERB[status]}${part.title}`}>
                      {VERB[status]}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="button-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canFinish(run.data)}
              onClick={async () => {
                await finishRun(ds, run.id)
                navigate(`/parent/assessment/report/${run.id}`)
              }}
            >
              生成评估报告
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => window.confirm('放弃本次评估？已做的部分不会保存。') && discardRun(run.id)}
            >
              放弃本次评估
            </button>
          </div>
          {!canFinish(run.data) && <p className="muted">完成课内认读和听写后（拓展认读开放时也需要完成）就可以生成报告。</p>}
        </section>
      )}

      <section className="history" aria-labelledby="history-title">
        <h2 id="history-title" className="section-title">
          历史评估
        </h2>
        {finished.length === 0 ? (
          <p className="muted">还没有完成过评估。建议每 4 周评估一次，对比进步。</p>
        ) : (
          <ul className="history-list">
            {finished.map((r) => (
              <li key={r.id}>
                <Link className="card history-item" to={`/parent/assessment/report/${r.id}`}>
                  <span>{r.data.report!.date}</span>
                  <span>课内识字量约 {r.data.report!.recognition.estimate} 字</span>
                  <span className="muted">建议：{r.data.report!.route}路线 · {r.data.report!.level}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
