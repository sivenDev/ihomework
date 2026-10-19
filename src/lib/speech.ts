// 汉字朗读：使用浏览器自带的中文语音（Web Speech API），不联网。

/**
 * unsupported：浏览器没有网页朗读功能（如基于安卓 WebView 的手机自带浏览器）
 * unavailable：支持朗读，但设备上没有中文语音
 */
export type SpeechStatus = 'checking' | 'available' | 'unavailable' | 'unsupported'

export interface Speaker {
  status(): SpeechStatus
  speak(text: string): void
  /** 朗读并在读完（或出错、超时）后返回，用于按顺序播放 */
  speakAndWait(text: string): Promise<void>
  subscribe(listener: () => void): () => void
}

const CHECK_TIMEOUT_MS = 2_000

function isChineseVoice(voice: SpeechSynthesisVoice) {
  return /^(zh|cmn)([-_]|$)/i.test(voice.lang)
}

export function createWebSpeaker(): Speaker {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  const listeners = new Set<() => void>()
  let voice: SpeechSynthesisVoice | undefined
  let status: SpeechStatus = synth ? 'checking' : 'unsupported'

  const notify = () => listeners.forEach((l) => l())
  const pickVoice = () => {
    if (!synth) return
    const voices = synth.getVoices().filter(isChineseVoice)
    voice = voices.find((v) => /CN/i.test(v.lang)) ?? voices[0]
    if (voice && status !== 'available') {
      status = 'available'
      notify()
    }
  }

  if (synth) {
    pickVoice()
    synth.addEventListener?.('voiceschanged', pickVoice)
    // 安卓 Chrome 的语音列表是异步加载的，等一会儿还没有中文语音才判定为不可用
    setTimeout(() => {
      if (status === 'checking') {
        status = 'unavailable'
        notify()
      }
    }, CHECK_TIMEOUT_MS)
  }

  const speakAndWait = (text: string): Promise<void> => {
    if (!synth) return Promise.resolve()
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.8
    if (voice) utterance.voice = voice
    return new Promise<void>((resolve) => {
      // 有的设备不触发 onend，按文字长度估一个上限
      const timer = window.setTimeout(resolve, 800 + [...text].length * 450)
      const done = () => {
        window.clearTimeout(timer)
        resolve()
      }
      utterance.onend = done
      utterance.onerror = done
      synth.speak(utterance)
    })
  }

  return {
    status: () => status,
    speak: (text) => {
      void speakAndWait(text)
    },
    speakAndWait,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

let current: Speaker | undefined

export function getSpeaker(): Speaker {
  current ??= createWebSpeaker()
  return current
}

/** 测试中替换为假实现 */
export function setSpeaker(speaker: Speaker) {
  current = speaker
}
