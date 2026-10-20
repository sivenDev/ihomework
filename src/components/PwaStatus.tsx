import { applyUpdate, dismissOfflineReady, usePwaState } from '../lib/pwa'
import './PwaStatus.css'

/** 离线数据下载进度、离线可用提示、新版本提示（点了才更新，不在使用中途强制刷新）。 */
export function PwaStatus() {
  const { progress, offlineReady, updateReady } = usePwaState()
  if (updateReady)
    return (
      <div className="pwa-status" role="status">
        <span>有新版本了</span>
        <button type="button" className="btn btn-primary" onClick={applyUpdate}>
          更新
        </button>
      </div>
    )
  if (progress)
    return (
      <div className="pwa-status" role="status" data-testid="pwa-progress">
        <span>
          正在下载离线数据 {Math.floor((progress.done / progress.total) * 100)}%
        </span>
        <span className="pwa-bar" aria-hidden="true">
          <span className="pwa-fill" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </span>
      </div>
    )
  if (offlineReady)
    return (
      <div className="pwa-status" role="status" data-testid="pwa-ready">
        <span>离线数据已准备好，断网也能用</span>
        <button type="button" className="btn btn-quiet" onClick={dismissOfflineReady}>
          知道了
        </button>
      </div>
    )
  return null
}
