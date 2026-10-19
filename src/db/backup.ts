import { db, type BlobRow } from './schema'

export const BACKUP_FORMAT = 'ihomework-backup'
export const BACKUP_VERSION = 1

interface EncodedBlob {
  id: string
  createdAt: number
  type: string
  base64: string
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: string
  tables: Record<string, unknown[]>
}

export class BackupError extends Error {}

function tableNames(): string[] {
  return db.tables.map((t) => t.name)
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

export async function exportBackup(now: Date = new Date()): Promise<BackupFile> {
  // 先在一个只读事务里取出全部数据，再在事务外编码图片（事务内等待非数据库操作会让事务提前结束）
  const raw: Record<string, unknown[]> = {}
  await db.transaction('r', db.tables, async () => {
    for (const table of db.tables) raw[table.name] = await table.toArray()
  })
  const tables: Record<string, unknown[]> = { ...raw }
  tables.blobs = await Promise.all(
    ((raw.blobs ?? []) as BlobRow[]).map(async (r): Promise<EncodedBlob> => ({
      id: r.id,
      createdAt: r.createdAt,
      type: r.blob.type,
      base64: await blobToBase64(r.blob),
    })),
  )
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), tables }
}

export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError('文件不是有效的备份文件')
  }
  const file = data as Partial<BackupFile>
  if (!file || file.format !== BACKUP_FORMAT) throw new BackupError('文件不是汉字闯关的备份文件')
  if (file.version !== BACKUP_VERSION) throw new BackupError('备份文件版本不受支持')
  if (!file.tables || typeof file.tables !== 'object') throw new BackupError('备份文件缺少数据')
  const known = new Set(tableNames())
  for (const [name, rows] of Object.entries(file.tables)) {
    if (!known.has(name)) throw new BackupError(`备份文件包含未知的数据表：${name}`)
    if (!Array.isArray(rows)) throw new BackupError(`数据表格式错误：${name}`)
  }
  return file as BackupFile
}

/** 用备份覆盖全部本地数据。任何一步失败都会整体回滚，原有数据保持不变。 */
export async function importBackup(file: BackupFile): Promise<void> {
  const decoded: Record<string, unknown[]> = {}
  for (const [name, rows] of Object.entries(file.tables)) {
    decoded[name] =
      name === 'blobs'
        ? (rows as EncodedBlob[]).map((r) => ({
            id: r.id,
            createdAt: r.createdAt,
            blob: base64ToBlob(r.base64, r.type),
          }))
        : rows
  }
  try {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear()
        const rows = decoded[table.name]
        if (rows?.length) await table.bulkAdd(rows as never[])
      }
    })
  } catch (error) {
    throw new BackupError(`导入失败，原有数据未改变（${(error as Error).message}）`)
  }
}
