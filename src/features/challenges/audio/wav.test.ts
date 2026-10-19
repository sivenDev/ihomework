// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { encodeWav } from './wav'

describe('encodeWav', () => {
  it('writes a 16-bit mono PCM WAV header and clamps samples', async () => {
    const blob = encodeWav(new Float32Array([0, 0.5, -1, 2]), 16000)
    expect(blob.type).toBe('audio/wav')
    const view = new DataView(await blob.arrayBuffer())
    const text = (o: number) => String.fromCharCode(...new Uint8Array(view.buffer, o, 4))
    expect(text(0)).toBe('RIFF')
    expect(text(8)).toBe('WAVE')
    expect(view.getUint16(22, true)).toBe(1) // 单声道
    expect(view.getUint32(24, true)).toBe(16000)
    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getUint32(40, true)).toBe(8) // 4 个样本 × 2 字节
    expect(view.byteLength).toBe(44 + 8)
    expect(view.getInt16(44 + 2, true)).toBe(16383)
    expect(view.getInt16(44 + 4, true)).toBe(-32768)
    expect(view.getInt16(44 + 6, true)).toBe(32767)
  })
})
