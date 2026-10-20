import { describe, expect, it } from 'vitest'
import { newWriting, nextStep, previousStep, splitSentences, stepComplete, storySlots, type WritingData } from './flow'

function draft(patch: Partial<WritingData> = {}): WritingData {
  return { ...newWriting(1, 1), ...patch }
}

describe('writing flow', () => {
  it('goes images → clues → reason → report → upgrade', () => {
    expect(nextStep('images')).toBe('clues')
    expect(nextStep('report')).toBe('upgrade')
    expect(nextStep('upgrade')).toBeNull()
    expect(previousStep('clues')).toBe('images')
    expect(previousStep('images')).toBeNull()
  })

  it('needs at least one picture', () => {
    expect(stepComplete(draft(), 'images')).toBe(false)
    expect(stepComplete(draft({ imageIds: ['a'] }), 'images')).toBe(true)
  })

  it('needs all four clues', () => {
    const clues = { time: '下午', place: '公园', people: '小明', event: ' ' }
    expect(stepComplete(draft({ clues }), 'clues')).toBe(false)
    expect(stepComplete(draft({ clues: { ...clues, event: '踢球' } }), 'clues')).toBe(true)
  })

  it('one picture uses 因为/所以/结果, several pictures one sentence each', () => {
    expect(storySlots(1)).toEqual(['因为', '所以', '结果'])
    expect(storySlots(3)).toHaveLength(3)
    expect(stepComplete(draft({ imageIds: ['a'], story: ['天气好', '去踢球'] }), 'reason')).toBe(false)
    expect(stepComplete(draft({ imageIds: ['a'], story: ['天气好', '去踢球', '很开心'] }), 'reason')).toBe(true)
    expect(stepComplete(draft({ imageIds: ['a', 'b'], story: ['第一句', '第二句'] }), 'reason')).toBe(true)
  })

  it('the report can be typed or a photo of the paper', () => {
    expect(stepComplete(draft(), 'report')).toBe(false)
    expect(stepComplete(draft({ report: { text: '小明踢球。' } }), 'report')).toBe(true)
    expect(stepComplete(draft({ report: { text: '', photoId: 'p' } }), 'report')).toBe(true)
  })

  it('the upgrade needs a sentence, a self-rating and a rewrite', () => {
    expect(stepComplete(draft({ upgrade: { sentence: '小明踢球。', rewrite: '' } }), 'upgrade')).toBe(false)
    expect(stepComplete(draft({ upgrade: { sentence: '小明踢球。', selfLevel: 1, rewrite: '下午，小明在操场上踢球。' } }), 'upgrade')).toBe(true)
  })

  it('splits a report into sentences', () => {
    expect(splitSentences('下午，小明在踢球。小狗跑来了！\n大家都笑了')).toEqual(['下午，小明在踢球。', '小狗跑来了！', '大家都笑了'])
  })
})
