import Dexie, { type EntityTable } from 'dexie'

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
  sources: string[]
  updatedAt: number
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
  }
}

export const db = new AppDatabase()
