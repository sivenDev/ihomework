import { useState } from 'react'
import { useSpeechStatus } from '../lib/useSpeech'

const DISMISS_KEY = 'ihomework.speechNoticeDismissed'

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** 设备没有中文语音时的提示，不影响其他功能。 */
export function SpeechNotice() {
  const status = useSpeechStatus()
  const [dismissed, setDismissed] = useState(readDismissed)

  if (status !== 'unavailable' || dismissed) return null

  return (
    <div className="speech-notice" role="status">
      <span>
        这台设备没有找到中文语音，点读时会听不到声音。可以在系统“设置 → 文字转语音”里安装中文语音包。
      </span>
      <button
        type="button"
        className="btn btn-quiet"
        onClick={() => {
          setDismissed(true)
          try {
            localStorage.setItem(DISMISS_KEY, '1')
          } catch {
            // 无法保存时只在本次隐藏
          }
        }}
      >
        知道了
      </button>
    </div>
  )
}
