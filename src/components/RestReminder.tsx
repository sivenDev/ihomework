/** 达到使用时长上限后的休息提示，盖住整个孩子界面。 */
export function RestReminder({ minutes, onResume }: { minutes: number; onResume: () => void }) {
  return (
    <div className="rest-overlay" role="dialog" aria-modal="true" aria-labelledby="rest-title">
      <div className="card rest-card">
        <div className="rest-emoji" aria-hidden="true">
          🌿
        </div>
        <h2 id="rest-title">休息一下吧</h2>
        <p>你已经学习了 {minutes} 分钟，去喝口水、看看远处吧！</p>
        <button type="button" className="btn btn-primary" onClick={onResume}>
          休息好了，继续
        </button>
      </div>
    </div>
  )
}
