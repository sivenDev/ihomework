// @vitest-environment node
// Node 原生 Blob 支持 arrayBuffer 和结构化克隆，jsdom 的 Blob 不支持
import { beforeEach, describe, expect, it } from 'vitest'
import { BACKUP_FORMAT, BackupError, exportBackup, importBackup, parseBackup } from './backup'
import { db } from './schema'
import { getSettings, updateSettings } from './settings'

async function seed() {
  await updateSettings({ practiceLevel: '加强', pinHash: 'h', pinSalt: 's' })
  await db.attempts.add({ char: '青', activity: 'flash', result: 'correct', date: '2026-10-19', ts: 1 })
  await db.bossCards.put({ char: '晴', stage: 1, due: '2026-10-20', streak: 0, status: 'active', sources: ['flash'], updatedAt: 1 })
  await db.blobs.put({ id: 'img1', createdAt: 2, blob: new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/png' }) })
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('backup', () => {
  it('restores identical data after export, clear and import', async () => {
    await seed()
    const file = parseBackup(JSON.stringify(await exportBackup()))
    await Promise.all(db.tables.map((t) => t.clear()))

    await importBackup(file)

    expect(await getSettings()).toMatchObject({ practiceLevel: '加强', pinHash: 'h', pinSalt: 's' })
    expect(await db.attempts.toArray()).toEqual([
      { id: 1, char: '青', activity: 'flash', result: 'correct', date: '2026-10-19', ts: 1 },
    ])
    expect((await db.bossCards.get('晴'))?.due).toBe('2026-10-20')
    const blob = (await db.blobs.get('img1'))!.blob
    expect(blob.type).toBe('image/png')
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([1, 2, 3, 250])
  })

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError)
    expect(() => parseBackup(JSON.stringify({ format: 'other' }))).toThrow(BackupError)
    expect(() => parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 99, tables: {} }))).toThrow(BackupError)
    expect(() =>
      parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1, tables: { hacked: [] } })),
    ).toThrow(/未知的数据表/)
  })

  it('keeps existing data when an import fails midway', async () => {
    await seed()
    const broken = parseBackup(
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: 1,
        exportedAt: '',
        tables: { settings: [{ key: 'practiceLevel', value: '轻松' }], attempts: [{ id: 1 }, { id: 1 }] },
      }),
    )

    await expect(importBackup(broken)).rejects.toThrow(BackupError)

    expect((await getSettings()).practiceLevel).toBe('加强')
    expect(await db.attempts.count()).toBe(1)
    expect(await db.blobs.count()).toBe(1)
  })
})
