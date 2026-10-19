import { useState } from 'react'
import { Link } from 'react-router-dom'
import { pinyinOf } from '../lib/pinyin'

// 临时测试页（F005）：在真机上检查 Chrome 的在线语音识别能否识别孩子读单个字。决定方案后删除。

interface RecognitionResult {
  transcript: string
}
interface RecognitionEvent {
  results: ArrayLike<ArrayLike<RecognitionResult>>
}
interface Recognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  start: () => void
}

const TARGETS = ['晴', '天', '鹊', '寒', '冷', '树', '花', '水']

function getRecognition(): (new () => Recognition) | undefined {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function AsrCheck() {
  const Ctor = getRecognition()
  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const add = (line: string) => setLog((l) => [line, ...l])

  const listen = (target: string) => {
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = 'zh-CN'
    rec.interimResults = false
    rec.maxAlternatives = 5
    rec.continuous = false
    let started = 0
    rec.onstart = () => {
      started = performance.now()
    }
    setBusy(target)
    rec.onresult = (e) => {
      const alts = Array.from(e.results[0] ?? []).map((r) => r.transcript.trim())
      const ms = Math.round(performance.now() - started)
      const targetPy = pinyinOf(target)
      const hit = alts.some((t) => t.includes(target) || [...t].some((c) => pinyinOf(c) === targetPy))
      add(`读“${target}”(${targetPy})：${hit ? '✓ 判对' : '✗ 判错'}，${ms} 毫秒；识别为 ${alts.map((t) => `${t}(${[...t].map(pinyinOf).join(' ')})`).join(' / ')}`)
    }
    rec.onerror = (e) => add(`读“${target}”：出错 ${e.error}`)
    rec.onend = () => setBusy(null)
    try {
      rec.start()
    } catch (err) {
      add(`读“${target}”：无法开始 ${(err as Error).message}`)
      setBusy(null)
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>语音识别测试</h1>
        <Link className="btn btn-quiet" to="/">
          返回
        </Link>
      </div>
      <section className="card" style={{ display: 'grid', gap: 12 }}>
        <p>
          语音识别：<strong>{Ctor ? '浏览器支持' : '浏览器不支持'}</strong>
        </p>
        <p className="muted">
          请孩子点一个字，听到“滴”声或看到按钮变灰后，大声读出这个字。每个字可以多试几次，也可以故意读错一次，看能不能判出来。然后把下面的结果截图发回。
        </p>
        <div className="button-row">
          {TARGETS.map((t) => (
            <button type="button" key={t} className="btn big-btn" disabled={!Ctor || busy !== null} onClick={() => listen(t)}>
              {busy === t ? '正在听…' : `读：${t}`}
            </button>
          ))}
        </div>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14, margin: 0 }} data-testid="asr-log">
          {`UA: ${navigator.userAgent}\n${log.join('\n')}`}
        </pre>
      </section>
    </div>
  )
}
