import { afterEach, describe, expect, it, vi } from 'vitest'
import { createWebSpeaker } from './speech'

type FakeSynth = { getVoices: () => { lang: string }[]; addEventListener: () => void }

function withSynth(synth: FakeSynth | undefined) {
  if (synth) Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
  else Reflect.deleteProperty(window, 'speechSynthesis')
}

afterEach(() => {
  Reflect.deleteProperty(window, 'speechSynthesis')
  vi.useRealTimers()
})

describe('createWebSpeaker status', () => {
  it('is unsupported when the browser has no speechSynthesis (e.g. Android WebView browsers)', () => {
    withSynth(undefined)
    expect(createWebSpeaker().status()).toBe('unsupported')
  })

  it('is unavailable when speech is supported but no Chinese voice appears', () => {
    vi.useFakeTimers()
    withSynth({ getVoices: () => [{ lang: 'en-US' }], addEventListener: () => {} })
    const speaker = createWebSpeaker()
    expect(speaker.status()).toBe('checking')
    vi.advanceTimersByTime(2_000)
    expect(speaker.status()).toBe('unavailable')
  })

  it('is available when a Chinese voice exists', () => {
    withSynth({ getVoices: () => [{ lang: 'en-US' }, { lang: 'zh-CN' }], addEventListener: () => {} })
    expect(createWebSpeaker().status()).toBe('available')
  })
})
