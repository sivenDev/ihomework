import { useEffect } from 'react'
import { PinyinText } from '../../components/PinyinText'
import { useNow } from '../../lib/useNow'
import { REST_MINUTES } from './logic/levels'
import { startSegmentRest } from './store'

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** 加强级别两段之间的休息倒计时：时间到了才能开始第二段。 */
export function SegmentRest({ until, onStart }: { until?: number; onStart: () => void }) {
  const now = useNow()
  // 因为第一段时间到了而进入休息时，在这里记下休息结束的时刻
  useEffect(() => {
    if (until === undefined) void startSegmentRest()
  }, [until])

  const left = until === undefined || now === null ? REST_MINUTES * 60 : Math.max(0, Math.ceil((until - now) / 1000))
  return (
    <div className="rest-overlay" role="dialog" aria-modal="true" aria-labelledby="segment-rest-title">
      <div className="card rest-card">
        <div className="rest-emoji" aria-hidden="true">
          ⏸️
        </div>
        <h2 id="segment-rest-title">
          <PinyinText text={`第一段结束啦，休息 ${REST_MINUTES} 分钟`} />
        </h2>
        <p>
          <PinyinText text="站起来走一走，喝口水，看看远处。休息好了再开始第二段。" speak />
        </p>
        <div className="rest-countdown" data-testid="rest-countdown" aria-live="polite">
          {clock(left)}
        </div>
        <button type="button" className="btn btn-primary big-btn" disabled={left > 0} onClick={onStart}>
          <PinyinText text={left > 0 ? '还在休息' : '开始第二段'} />
        </button>
      </div>
    </div>
  )
}
