// 开口检测（F005）：根据每帧的音量判断孩子什么时候开始读、什么时候读完。纯逻辑，时间按帧数计算。

export interface VadOptions {
  /** 每帧时长（毫秒） */
  frameMs: number
  /** 开头用来估计环境噪音的时长 */
  calibrationMs?: number
  /** 阈值下限（RMS） */
  minThreshold?: number
  /** 阈值 = 环境噪音 × 这个倍数（不低于下限） */
  noiseFactor?: number
  /** 连续超过阈值多久算开口 */
  startMs?: number
  /** 开口后连续安静多久算读完 */
  endSilenceMs?: number
  /** 读音短于这个时长视为杂音 */
  minSpeechMs?: number
}

/** 一段读音，单位为毫秒（从开始检测算起） */
export interface Utterance {
  start: number
  end: number
}

export interface Vad {
  /** 推入一帧音量；某段读音结束时返回它 */
  push(level: number): Utterance | null
  /** 是否正在说话（用于界面上的“正在听”提示） */
  readonly speaking: boolean
}

export function createVad(options: VadOptions): Vad {
  const {
    frameMs,
    calibrationMs = 500,
    minThreshold = 0.015,
    noiseFactor = 3,
    startMs = 100,
    endSilenceMs = 600,
    minSpeechMs = 150,
  } = options
  const calibrationFrames = Math.round(calibrationMs / frameMs)
  const calibration: number[] = []
  let threshold = Infinity
  let frame = 0
  let loudRun = 0
  let silentRun = 0
  let speechStart: number | null = null
  let lastLoudEnd = 0

  return {
    get speaking() {
      return speechStart !== null
    },
    push(level: number) {
      const t = frame * frameMs
      frame++
      if (calibration.length < calibrationFrames) {
        calibration.push(level)
        if (calibration.length === calibrationFrames) {
          const sorted = [...calibration].sort((a, b) => a - b)
          threshold = Math.max(minThreshold, sorted[Math.floor(sorted.length / 2)] * noiseFactor)
        }
        return null
      }

      if (level > threshold) {
        loudRun++
        silentRun = 0
        lastLoudEnd = t + frameMs
        if (speechStart === null && loudRun * frameMs >= startMs) speechStart = t - (loudRun - 1) * frameMs
        return null
      }

      loudRun = 0
      silentRun++
      if (speechStart !== null && silentRun * frameMs >= endSilenceMs) {
        const utterance = { start: speechStart, end: lastLoudEnd }
        speechStart = null
        return utterance.end - utterance.start >= minSpeechMs ? utterance : null
      }
      return null
    },
  }
}
