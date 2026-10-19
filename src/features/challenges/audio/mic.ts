// 麦克风采集（F005）：测音量做开口检测，并把本关的声音降采样后暂存在内存里，用来截取每个字的录音。
// 录音不写入数据库、不上传；stop() 后释放麦克风。

import { createVad, type Utterance } from './vad'
import { encodeWav } from './wav'

const STORE_RATE = 16000
const PRE_ROLL_MS = 300
const POST_ROLL_MS = 200
const FRAME_SAMPLES = 1024

export interface MicSession {
  /** 读完一个字时回调，附带这段读音的录音 */
  onUtterance: (cb: (utterance: Utterance, clip: Blob) => void) => void
  /** 当前音量（0～1 左右）和是否正在说话，用于界面提示 */
  level: () => number
  speaking: () => boolean
  /** 从开始录音到现在的毫秒数（与读音区间同一时间轴） */
  now: () => number
  stop: () => void
}

export class MicUnavailableError extends Error {}

export async function startMic(): Promise<MicSession> {
  if (!navigator.mediaDevices?.getUserMedia) throw new MicUnavailableError('这个浏览器不能使用麦克风')
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
  } catch {
    throw new MicUnavailableError('没有麦克风权限')
  }

  const ctx = new AudioContext()
  await ctx.resume()
  const source = ctx.createMediaStreamSource(stream)
  // ScriptProcessor 兼容性最好；输出为静音，只为了拿到输入数据
  const processor = ctx.createScriptProcessor(FRAME_SAMPLES, 1, 1)
  const ratio = ctx.sampleRate / STORE_RATE
  const vad = createVad({ frameMs: (FRAME_SAMPLES / ctx.sampleRate) * 1000 })
  const chunks: Float32Array[] = []
  let stored = 0
  let currentLevel = 0
  let listener: ((u: Utterance, clip: Blob) => void) | null = null

  const slice = (fromMs: number, toMs: number): Float32Array => {
    const from = Math.max(0, Math.floor((fromMs * STORE_RATE) / 1000))
    const to = Math.min(stored, Math.ceil((toMs * STORE_RATE) / 1000))
    const out = new Float32Array(Math.max(0, to - from))
    let offset = 0
    for (const chunk of chunks) {
      const start = Math.max(from - offset, 0)
      const end = Math.min(to - offset, chunk.length)
      if (end > start) out.set(chunk.subarray(start, end), offset + start - from)
      offset += chunk.length
      if (offset >= to) break
    }
    return out
  }

  processor.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0)
    let sum = 0
    for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
    currentLevel = Math.sqrt(sum / input.length)

    // 降采样到 16 kHz 暂存
    const outLength = Math.floor(input.length / ratio)
    const down = new Float32Array(outLength)
    for (let i = 0; i < outLength; i++) down[i] = input[Math.floor(i * ratio)]
    chunks.push(down)
    stored += outLength

    const utterance = vad.push(currentLevel)
    if (utterance && listener) {
      const clip = encodeWav(slice(utterance.start - PRE_ROLL_MS, utterance.end + POST_ROLL_MS), STORE_RATE)
      listener(utterance, clip)
    }
  }
  source.connect(processor)
  processor.connect(ctx.destination)

  return {
    onUtterance: (cb) => {
      listener = cb
    },
    level: () => currentLevel,
    speaking: () => vad.speaking,
    now: () => (stored * 1000) / STORE_RATE,
    stop: () => {
      processor.onaudioprocess = null
      processor.disconnect()
      source.disconnect()
      stream.getTracks().forEach((t) => t.stop())
      void ctx.close()
      chunks.length = 0
    },
  }
}
