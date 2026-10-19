import { describe, expect, it } from 'vitest'
import { createVad, type Utterance } from './vad'

const FRAME = 20

/** 按 [音量, 毫秒] 段生成帧，返回检测到的读音区间 */
function run(segments: [number, number][], opts = {}): Utterance[] {
  const vad = createVad({ frameMs: FRAME, ...opts })
  const found: Utterance[] = []
  for (const [level, ms] of segments) {
    for (let t = 0; t < ms; t += FRAME) {
      const u = vad.push(level)
      if (u) found.push(u)
    }
  }
  return found
}

const QUIET = 0.003
const VOICE = 0.2

describe('createVad', () => {
  it('stays silent in a quiet room', () => {
    expect(run([[QUIET, 5000]])).toEqual([])
  })

  it('detects one spoken character after the pause that follows it', () => {
    const found = run([
      [QUIET, 1000],
      [VOICE, 400],
      [QUIET, 1000],
    ])
    expect(found).toHaveLength(1)
    expect(found[0].start).toBe(1000)
    expect(found[0].end).toBe(1400)
  })

  it('does not report before the pause is long enough', () => {
    expect(
      run([
        [QUIET, 1000],
        [VOICE, 400],
        [QUIET, 400],
      ]),
    ).toEqual([])
  })

  it('ignores short clicks and bumps', () => {
    expect(
      run([
        [QUIET, 1000],
        [VOICE, 100],
        [QUIET, 1000],
      ]),
    ).toEqual([])
  })

  it('treats a brief dip inside a word as part of the same utterance', () => {
    const found = run([
      [QUIET, 1000],
      [VOICE, 200],
      [QUIET, 200],
      [VOICE, 200],
      [QUIET, 1000],
    ])
    expect(found).toEqual([{ start: 1000, end: 1600 }])
  })

  it('reports two characters read one after another', () => {
    expect(
      run([
        [QUIET, 1000],
        [VOICE, 300],
        [QUIET, 800],
        [VOICE, 300],
        [QUIET, 800],
      ]),
    ).toHaveLength(2)
  })

  it('raises the threshold in a noisy room so background noise is not speech', () => {
    const noisy = 0.03
    expect(run([[noisy, 3000]])).toEqual([])
    expect(
      run([
        [noisy, 1000],
        [0.3, 400],
        [noisy, 1000],
      ]),
    ).toHaveLength(1)
  })

  it('ignores speech during the first calibration half second', () => {
    expect(
      run([
        [VOICE, 400],
        [QUIET, 1000],
      ]),
    ).toEqual([])
  })
})
