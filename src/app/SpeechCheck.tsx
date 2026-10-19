import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSpeaker } from '../lib/speech'
import { useSpeechStatus } from '../lib/useSpeech'

// 临时诊断页（缺陷 B001）：在真机上查看浏览器能用的语音，并逐种方式试读。修复后删除。

interface VoiceInfo {
  name: string
  lang: string
  localService: boolean
  default: boolean
}

function readVoices(): VoiceInfo[] {
  const synth = window.speechSynthesis
  if (!synth) return []
  return synth.getVoices().map((v) => ({ name: v.name, lang: v.lang, localService: v.localService, default: v.default }))
}

export function SpeechCheck() {
  const status = useSpeechStatus()
  const [voices, setVoices] = useState<VoiceInfo[]>(readVoices)
  const [log, setLog] = useState<string[]>([])
  const [start] = useState(() => Date.now())

  const add = (line: string) => setLog((l) => [...l, `${((Date.now() - start) / 1000).toFixed(1)}s ${line}`])

  useEffect(() => {
    const synth = window.speechSynthesis
    if (!synth) return
    const update = () => setVoices(readVoices())
    synth.addEventListener?.('voiceschanged', update)
    const id = window.setInterval(update, 1_000)
    return () => {
      synth.removeEventListener?.('voiceschanged', update)
      window.clearInterval(id)
    }
  }, [])

  const tryRaw = (label: string, text: string, opts: { lang?: string; voiceLang?: RegExp; cancelFirst: boolean }) => {
    const synth = window.speechSynthesis
    if (!synth) {
      add(`${label}：浏览器不支持 speechSynthesis`)
      return
    }
    if (opts.cancelFirst) synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    if (opts.lang) u.lang = opts.lang
    if (opts.voiceLang) {
      const v = synth.getVoices().find((x) => opts.voiceLang!.test(x.lang))
      if (v) u.voice = v
      add(`${label}：使用语音 ${v ? `${v.name} (${v.lang})` : '无匹配，交给系统默认'}`)
    }
    u.onstart = () => add(`${label}：开始播放`)
    u.onend = () => add(`${label}：播放结束`)
    u.onerror = (e) => add(`${label}：出错 ${e.error}`)
    synth.speak(u)
    add(`${label}：已提交（speaking=${synth.speaking}, pending=${synth.pending}）`)
  }

  const report = [
    `UA: ${navigator.userAgent}`,
    `speechSynthesis: ${'speechSynthesis' in window ? '支持' : '不支持'}`,
    `应用判断: ${status}`,
    `语音数量: ${voices.length}`,
    ...voices.map((v) => `- ${v.name} | ${v.lang} | 本地=${v.localService} | 默认=${v.default}`),
    '日志:',
    ...log,
  ].join('\n')

  return (
    <div className="page">
      <div className="topbar">
        <h1>语音检测</h1>
        <Link className="btn btn-quiet" to="/">
          返回
        </Link>
      </div>
      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <p className="muted">请依次点下面的按钮，听有没有声音，然后把下方结果截图发回。</p>
        <div className="button-row">
          <button type="button" className="btn" onClick={() => { add('应用当前方式'); getSpeaker().speak('汉字闯关') }}>
            1. 应用当前方式读“汉字闯关”
          </button>
          <button type="button" className="btn" onClick={() => tryRaw('中文-不指定语音', '汉字闯关', { lang: 'zh-CN', cancelFirst: false })}>
            2. 中文，不指定语音
          </button>
          <button type="button" className="btn" onClick={() => tryRaw('中文-指定中文语音', '汉字闯关', { lang: 'zh-CN', voiceLang: /^(zh|cmn)/i, cancelFirst: false })}>
            3. 中文，指定中文语音
          </button>
          <button type="button" className="btn" onClick={() => tryRaw('英文-默认', 'Hello, this is a test.', { lang: 'en-US', cancelFirst: false })}>
            4. 英文 Hello
          </button>
          <button type="button" className="btn" onClick={() => tryRaw('不设语言', '汉字闯关 hello', { cancelFirst: false })}>
            5. 不设语言
          </button>
        </div>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14, margin: 0 }} data-testid="speech-report">
          {report}
        </pre>
      </div>
    </div>
  )
}
