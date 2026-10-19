import { Link } from 'react-router-dom'
import { StoredImage } from '../../components/StoredImage'
import { WritingLevelPicker, WritingRubric } from '../../components/WritingRubric'
import { RUBRIC_ITEMS, type RubricScores, type WritingPart } from './logic/types'
import { saveImage, updateRun } from './store'
import { useAssessment } from './useAssessment'
import './assessment.css'

export function WritingPage() {
  const ctx = useAssessment()
  if (!ctx) return <div className="page muted">正在加载…</div>
  const { run } = ctx
  const part: WritingPart = run.data.parts.writing ?? { done: false }
  const scores = part.scores ?? ({} as Partial<RubricScores>)
  const complete = RUBRIC_ITEMS.every((i) => scores[i.key]) && !!part.level

  const save = (patch: Partial<WritingPart>) =>
    updateRun(run.id, (d) => ({ ...d, parts: { ...d.parts, writing: { ...(d.parts.writing ?? { done: false }), ...patch } } }))

  const upload = async (file: File | undefined, key: 'imageId' | 'photoId') => {
    if (file) await save({ [key]: await saveImage(file) })
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>看图写作</h1>
        <Link className="btn btn-quiet" to="/parent/assessment">
          返回
        </Link>
      </div>
      <div className="writing-grid">
        <section className="card">
          <h2>1. 给孩子一幅图</h2>
          <p className="muted">选一幅图（可以拍课本上的图），先请孩子口头讲，再写下来。</p>
          <label className="btn">
            {part.imageId ? '换一幅图' : '选择图片'}
            <input type="file" accept="image/*" className="sr-only" aria-label="选择写作图片" onChange={(e) => upload(e.target.files?.[0], 'imageId')} />
          </label>
          {part.imageId && <StoredImage id={part.imageId} alt="写作图片" className="writing-image" />}
          <label className="btn">
            {part.photoId ? '重拍作文' : '拍下孩子的作文（可选）'}
            <input type="file" accept="image/*" className="sr-only" aria-label="上传作文照片" onChange={(e) => upload(e.target.files?.[0], 'photoId')} />
          </label>
          {part.photoId && <StoredImage id={part.photoId} alt="作文照片" className="writing-image" />}
        </section>
        <section className="card">
          <h2>2. 按评分表打分</h2>
          <WritingRubric scores={scores} onChange={(key, value) => save({ scores: { ...scores, [key]: value } as RubricScores })} />
          <h2>3. 孩子现在达到哪一级</h2>
          <WritingLevelPicker level={part.level} onChange={(level) => save({ level })} />
          <button type="button" className="btn btn-primary" disabled={!complete} onClick={() => save({ done: true })}>
            {part.done ? '已保存' : '完成评分'}
          </button>
        </section>
      </div>
    </div>
  )
}
