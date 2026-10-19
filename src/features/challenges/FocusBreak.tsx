import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PinyinText } from '../../components/PinyinText'
import { BREAK_SECONDS } from './logic/focus'

/** 专注提醒：孩子开始乱点时暂停，深呼吸后再继续。 */
export function FocusBreak({ message, hint, onResume }: { message: string; hint?: string; onResume: () => void }) {
  const [left, setLeft] = useState(BREAK_SECONDS)
  useEffect(() => {
    if (left <= 0) return
    const id = window.setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => window.clearTimeout(id)
  }, [left])

  return (
    <div className="rest-overlay" role="dialog" aria-modal="true" aria-label="专注提醒">
      <div className="card focus-card">
        <div className="summary-emoji" aria-hidden="true">
          🧘
        </div>
        <h2>
          <PinyinText text={message} speak />
        </h2>
        {hint && (
          <p className="focus-hint">
            <PinyinText text={hint} />
          </p>
        )}
        <p className="muted">
          <PinyinText text="先深呼吸三次，看清题目再选。" />
        </p>
        <div className="option-row">
          <Link className="btn big-btn" to="/">
            <PinyinText text="休息一下" />
          </Link>
          <button type="button" className="btn btn-primary big-btn" disabled={left > 0} onClick={onResume}>
            <PinyinText text={left > 0 ? `准备中 ${left}` : '我准备好了'} />
          </button>
        </div>
      </div>
    </div>
  )
}
