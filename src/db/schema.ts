import Dexie, { type EntityTable } from 'dexie'
import type { PracticeLevel, Route } from '../features/assessment/logic/types'
import type { DailyTask, TaskId } from '../features/daily/logic/planner'
import type { RedemptionStatus } from '../features/rewards/logic/xp'
import type { CharEdit, LessonEdit } from '../features/textbook/logic/merge'

// 本地数据库。后续计划只追加表或字段：新增 this.version(n).stores({...})，不修改已发布的版本。

export interface SettingRow {
  key: string
  value: unknown
}

export type AttemptResult = 'correct' | 'wrong' | 'hinted'

export interface AttemptRow {
  id?: number
  char: string
  activity: string
  result: AttemptResult
  date: string
  ts: number
}

export interface BossCardRow {
  char: string
  stage: number
  due: string
  streak: number
  status: 'active' | 'defeated'
  /** 打败后已通过的复查次数（F001） */
  checks?: number
  sources: string[]
  updatedAt: number
  /** 最近一次复习的日期（计划 06） */
  answeredOn?: string
}

export interface AssessmentRow {
  id?: number
  kind: string
  date: string
  data: unknown
}

export interface XpEventRow {
  id: string
  kind: string
  amount: number
  ts: number
}

export interface ReadingLogRow {
  id?: number
  date: string
  title: string
  minutes: number
  finished: boolean
}

export interface WritingRow {
  id?: number
  date: string
  data: unknown
}

export interface BlobRow {
  id: string
  blob: Blob
  createdAt: number
}

/** 评估等处产生、等待错字 Boss（计划 04）导入的错字 */
export interface PendingMistakeRow {
  char: string
  sources: string[]
  addedAt: number
}

export type ChallengeActivity = 'detective' | 'family' | 'flash'

/** 每个闯关玩法的难度与个人纪录（计划 05） */
export interface ChallengeStatRow {
  activity: ChallengeActivity
  level: number
  /** 各难度的最好成绩 */
  best: Record<number, number>
  plays: number
  lastAccuracy?: number
}

/** 字族网络中收集到的字族导图 */
export interface FamilyCollectionRow {
  phonetic: string
  chars: string[]
  date: string
}

/** 某一天的任务清单（计划 06）。当天第一次打开时生成；家长改了级别、路线等设置时重新生成，已完成的任务保留。 */
export interface DailyPlanRow {
  date: string
  /** 生成时依据的设置，变化时重新生成 */
  key: string
  level: PracticeLevel
  route: Route
  tasks: DailyTask[]
  done: Partial<Record<TaskId, boolean>>
  /** 正在进行的段（加强级别有两段） */
  segment: 1 | 2
  /** 两段之间休息到什么时候（毫秒时间戳） */
  restUntil?: number
  /** 必做任务全部完成 */
  complete: boolean
  createdAt: number
}

/** 周 Boss 战、单元挑战（计划 06） */
export interface ExamRow {
  id?: number
  kind: 'weekly' | 'unit'
  /** 周 Boss：那一周的周一；单元挑战：册-单元 */
  key: string
  title: string
  date: string
  chars: string[]
  /** 需要默写的字 */
  write: string[]
  status: 'pending' | 'done'
  results?: Record<string, boolean>
  /** 每个字是否读对（计划 08，用于识字量曲线） */
  readResults?: Record<string, boolean>
  /** 要默写的字是否写对 */
  writeResults?: Record<string, boolean>
  /** 出题时的课本进度 */
  progressLessonId?: string
  accuracy?: number
  doneOn?: string
}

/** 家长设置的奖励 */
export interface RewardRow {
  id: string
  name: string
  cost: number
  createdAt: number
}

/** 孩子的兑换申请：家长确认后才扣除可用经验值 */
export interface RedemptionRow {
  id: string
  rewardId: string
  name: string
  cost: number
  status: RedemptionStatus
  requestedAt: number
  decidedAt?: number
}

/** 孩子模式每天的使用时长（计划 08，家长看板“每日用时”） */
export interface UsageRow {
  date: string
  seconds: number
}

export const DB_NAME = 'ihomework'

export class AppDatabase extends Dexie {
  settings!: EntityTable<SettingRow, 'key'>
  attempts!: EntityTable<AttemptRow, 'id'>
  bossCards!: EntityTable<BossCardRow, 'char'>
  assessments!: EntityTable<AssessmentRow, 'id'>
  xpEvents!: EntityTable<XpEventRow, 'id'>
  readingLogs!: EntityTable<ReadingLogRow, 'id'>
  writings!: EntityTable<WritingRow, 'id'>
  blobs!: EntityTable<BlobRow, 'id'>
  lessonEdits!: EntityTable<LessonEdit, 'lessonId'>
  charEdits!: EntityTable<CharEdit, 'char'>
  pendingMistakes!: EntityTable<PendingMistakeRow, 'char'>
  challengeStats!: EntityTable<ChallengeStatRow, 'activity'>
  familyCollection!: EntityTable<FamilyCollectionRow, 'phonetic'>
  dailyPlans!: EntityTable<DailyPlanRow, 'date'>
  exams!: EntityTable<ExamRow, 'id'>
  rewards!: EntityTable<RewardRow, 'id'>
  redemptions!: EntityTable<RedemptionRow, 'id'>
  usage!: EntityTable<UsageRow, 'date'>

  constructor(name = DB_NAME) {
    super(name)
    this.version(1).stores({
      settings: 'key',
      attempts: '++id, char, activity, date',
      bossCards: 'char, due, status',
      assessments: '++id, kind, date',
      xpEvents: 'id, ts',
      readingLogs: '++id, date',
      writings: '++id, date',
      blobs: 'id',
    })
    // 计划 02：家长对课本字库的修改
    this.version(2).stores({
      lessonEdits: 'lessonId',
      charEdits: 'char',
    })
    // 计划 03：评估中出错、等待错字 Boss 导入的字
    this.version(3).stores({
      pendingMistakes: 'char',
    })
    // 计划 05：闯关难度、个人纪录、字族收藏
    this.version(4).stores({
      challengeStats: 'activity',
      familyCollection: 'phonetic',
    })
    // 计划 06：每日任务、周 Boss 与单元挑战、奖励兑换
    this.version(5).stores({
      dailyPlans: 'date',
      exams: '++id, kind, key',
      rewards: 'id',
      redemptions: 'id, status',
    })
    // 计划 08：每日使用时长
    this.version(6).stores({
      usage: 'date',
    })
  }
}

export const db = new AppDatabase()
