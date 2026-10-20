// 侦探看图写作的步骤（PRD 4.6）：选图 → 找线索 → 推理 → 写报告 → 句子升级 → 交给家长评分。纯函数。
import type { RubricScores } from '../../assessment/logic/types'
import type { GoalResult, WritingLevel } from './levels'

export type WritingStep = 'images' | 'clues' | 'reason' | 'report' | 'upgrade'

export const STEPS: WritingStep[] = ['images', 'clues', 'reason', 'report', 'upgrade']

export const STEP_NAMES: Record<WritingStep, string> = {
  images: '看图',
  clues: '找线索',
  reason: '推理',
  report: '写报告',
  upgrade: '句子升级',
}

export const CLUES = [
  { key: 'time', label: '时间', question: '这件事发生在什么时候？' },
  { key: 'place', label: '地点', question: '在什么地方？' },
  { key: 'people', label: '人物', question: '图上有谁？' },
  { key: 'event', label: '事件', question: '他们在做什么？发生了什么事？' },
] as const

export type ClueKey = (typeof CLUES)[number]['key']

export interface WritingData {
  /** draft：孩子还在写；submitted：等家长评分；scored：已评分 */
  status: 'draft' | 'submitted' | 'scored'
  step: WritingStep
  /** 写作时的实际等级 */
  level: WritingLevel
  /** 本次目标（拓展路线比实际等级高一级） */
  goal: WritingLevel
  imageIds: string[]
  clues: Partial<Record<ClueKey, string>>
  /** 一幅图：因为、所以、结果三句；多幅图：每幅图一句 */
  story: string[]
  report: { text: string; photoId?: string }
  upgrade: { sentence: string; selfLevel?: 1 | 2 | 3 | 4; rewrite: string }
  score?: { scores: RubricScores; total: number; result: GoalResult; date: string }
  submittedOn?: string
}

export function newWriting(level: WritingLevel, goal: WritingLevel): WritingData {
  return {
    status: 'draft',
    step: 'images',
    level,
    goal,
    imageIds: [],
    clues: {},
    story: [],
    report: { text: '' },
    upgrade: { sentence: '', rewrite: '' },
  }
}

/** 推理这一步要填的句子：一幅图用“因为……所以……结果……”，多幅图每图一句。 */
export function storySlots(imageCount: number): string[] {
  return imageCount <= 1 ? ['因为', '所以', '结果'] : Array.from({ length: imageCount }, (_, i) => `第 ${i + 1} 幅图`)
}

const filled = (s: string | undefined) => !!s && s.trim().length > 0

/** 这一步填好了，可以进入下一步。 */
export function stepComplete(data: WritingData, step: WritingStep): boolean {
  switch (step) {
    case 'images':
      return data.imageIds.length > 0
    case 'clues':
      return CLUES.every((c) => filled(data.clues[c.key]))
    case 'reason':
      return storySlots(data.imageIds.length).every((_, i) => filled(data.story[i]))
    case 'report':
      return filled(data.report.text) || !!data.report.photoId
    case 'upgrade':
      return filled(data.upgrade.sentence) && !!data.upgrade.selfLevel && filled(data.upgrade.rewrite)
  }
}

export function nextStep(step: WritingStep): WritingStep | null {
  return STEPS[STEPS.indexOf(step) + 1] ?? null
}

export function previousStep(step: WritingStep): WritingStep | null {
  return STEPS[STEPS.indexOf(step) - 1] ?? null
}

/** 把报告拆成句子，供“句子升级”挑选。 */
export function splitSentences(text: string): string[] {
  return (text.match(/[^。！？!?\n]+[。！？!?]*/g) ?? []).map((s) => s.trim()).filter((s) => s.length > 1)
}

export function rubricTotal(scores: RubricScores): number {
  return Object.values(scores).reduce((n, s) => n + s, 0)
}
