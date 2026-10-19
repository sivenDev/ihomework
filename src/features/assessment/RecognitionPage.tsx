import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { advanceExtension, extensionPool, startExtension } from './logic/sampling'
import type { Mark } from './logic/types'
import { updateRun } from './store'
import { useAssessment } from './useAssessment'
import './assessment.css'

interface Card {
  char: string
  result?: Mark
}

/** 认读：一屏一个大字，孩子读，家长判断。课内认读与拓展认读共用。 */
export function RecognitionPage({ mode }: { mode: 'recognition' | 'extension' }) {
  const ctx = useAssessment()
  const run = ctx?.run
  const ds = ctx?.ds

  // 进入拓展认读时生成第一层
  useEffect(() => {
    if (mode === 'extension' && run && ds && !run.data.parts.extension) {
      const pool = extensionPool(ds, { lessonId: run.data.progressLessonId })
      void updateRun(run.id, (d) => (d.parts.extension ? d : { ...d, parts: { ...d.parts, extension: startExtension(pool) } }))
    }
  }, [mode, run, ds])

  if (!ctx || !run || !ds) return <div className="page muted">正在加载…</div>

  const title = mode === 'recognition' ? '课内认读' : '拓展认读'
  const cards: Card[] =
    mode === 'recognition'
      ? (run.data.parts.recognition?.items ?? [])
      : (run.data.parts.extension?.layers.flatMap((l) => l.items) ?? [])
  const index = cards.findIndex((c) => !c.result)
  const finished = mode === 'recognition' ? index === -1 : !!run.data.parts.extension?.finished
  const answered = cards.filter((c) => c.result).length

  const mark = (result: Mark | undefined, at: number) =>
    updateRun(run.id, (d) => {
      if (mode === 'recognition') {
        d.parts.recognition!.items[at].result = result
        return d
      }
      let n = at
      let layerIndex = 0
      for (const layer of d.parts.extension!.layers) {
        if (n < layer.items.length) {
          layer.items[n].result = result
          break
        }
        n -= layer.items.length
        layerIndex++
      }
      const pool = extensionPool(ds, { lessonId: d.progressLessonId })
      // 撤销时去掉之后已生成的组，重新作答后再决定是否继续往下测
      const ext = result
        ? advanceExtension(d.parts.extension!, pool)
        : { layers: d.parts.extension!.layers.slice(0, layerIndex + 1), finished: false }
      return { ...d, parts: { ...d.parts, extension: ext } }
    })

  const undoIndex = index === -1 ? cards.length - 1 : index - 1

  return (
    <div className="page mark-page">
      <div className="topbar">
        <h1>{title}</h1>
        <Link className="btn btn-quiet" to="/parent/assessment">
          {finished ? '返回' : '暂停'}
        </Link>
      </div>
      {finished ? (
        <section className="card done-card">
          <h2>{title}完成</h2>
          <p>
            共 {cards.length} 个字，认识 {cards.filter((c) => c.result === 'correct').length} 个。
          </p>
          <Link className="btn btn-primary" to="/parent/assessment">
            返回评估
          </Link>
        </section>
      ) : index === -1 ? (
        <p className="muted">正在准备下一组字…</p>
      ) : (
        <>
          <p className="muted mark-progress">
            第 {answered + 1} 个{mode === 'recognition' ? ` / 共 ${cards.length} 个` : `（第 ${run.data.parts.extension!.layers.length} 组）`}
            ——请孩子读出这个字
          </p>
          <div className="flash-char" data-testid="flash-char">
            {cards[index].char}
          </div>
          <div className="mark-buttons">
            <button type="button" className="btn mark-btn mark-correct" onClick={() => mark('correct', index)}>
              ✓ 读对了
            </button>
            <button type="button" className="btn mark-btn mark-wrong" onClick={() => mark('wrong', index)}>
              ✗ 不认识 / 读错
            </button>
          </div>
        </>
      )}
      {undoIndex >= 0 && cards[undoIndex]?.result && (
        <button type="button" className="btn btn-quiet undo-btn" onClick={() => mark(undefined, undoIndex)}>
          撤销上一个（{cards[undoIndex].char}）
        </button>
      )}
    </div>
  )
}
