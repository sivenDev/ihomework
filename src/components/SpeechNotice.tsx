import { useState } from 'react'
import { chromeIntentUrl } from '../lib/chrome'
import type { SpeechStatus } from '../lib/speech'
import { useSpeechStatus } from '../lib/useSpeech'

const DISMISS_KEY = 'ihomework.speechNoticeDismissed'

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY)
  } catch {
    return null
  }
}

/** 设备不能朗读时的提示，不影响其他功能。按状态分别记住“知道了”。 */
export function SpeechNotice() {
  const status = useSpeechStatus()
  const [dismissed, setDismissed] = useState(readDismissed)

  if ((status !== 'unavailable' && status !== 'unsupported') || dismissed === status) return null

  const dismiss = (s: SpeechStatus) => {
    setDismissed(s)
    try {
      localStorage.setItem(DISMISS_KEY, s)
    } catch {
      // 无法保存时只在本次隐藏
    }
  }

  return (
    <div className="speech-notice" role="status">
      {status === 'unsupported' ? (
        <span>
          这个浏览器不支持朗读，点汉字会听不到声音。请用 <strong>Chrome 浏览器</strong>打开本网站：
          <span className="speech-notice-url">{location.href.split('#')[0]}</span>
        </span>
      ) : (
        <span>
          这台设备没有找到中文语音，点读时会听不到声音。可以在系统“设置 → 文字转语音”里安装中文语音包。
        </span>
      )}
      <span className="speech-notice-actions">
        {status === 'unsupported' && (
          <a className="btn btn-primary" href={chromeIntentUrl(location.href)}>
            用 Chrome 打开
          </a>
        )}
        <button type="button" className="btn btn-quiet" onClick={() => dismiss(status)}>
          知道了
        </button>
      </span>
    </div>
  )
}
