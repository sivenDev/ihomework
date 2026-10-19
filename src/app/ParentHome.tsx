import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BackupError, exportBackup, importBackup, parseBackup } from '../db/backup'
import { SESSION_LIMIT_OPTIONS, updateSettings } from '../db/settings'
import { localDate } from '../lib/date'
import { useParentSession } from './ParentSession'
import { useSettings } from './useSettings'

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export function ParentHome() {
  const settings = useSettings()
  const { lock } = useParentSession()
  const navigate = useNavigate()
  const fileInput = useRef<HTMLInputElement>(null)
  const [backupMessage, setBackupMessage] = useState<{ text: string; error?: boolean } | null>(null)

  const handleExport = async () => {
    const file = await exportBackup()
    download(`ihomework-backup-${localDate()}.json`, JSON.stringify(file))
    setBackupMessage({ text: '备份文件已导出，请保存好。' })
  }

  const handleImport = async (file: File) => {
    try {
      const backup = parseBackup(await file.text())
      if (!window.confirm('恢复备份会覆盖当前全部学习数据，确定吗？')) return
      await importBackup(backup)
      setBackupMessage({ text: '已从备份恢复。' })
    } catch (error) {
      setBackupMessage({
        text: error instanceof BackupError ? error.message : '恢复失败，原有数据未改变。',
        error: true,
      })
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <h1>家长模式</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            lock()
            navigate('/')
          }}
        >
          返回孩子模式
        </button>
      </div>

      <div className="parent-grid">
        <section className="card" aria-labelledby="textbook-title">
          <h2 id="textbook-title">课本与字库</h2>
          <p className="muted">设置孩子学到第几课，核对和修改每课的生字。</p>
          <div className="button-row">
            <Link className="btn btn-primary" to="/parent/textbook">
              打开课本与字库
            </Link>
          </div>
        </section>

        <section className="card" aria-labelledby="assessment-title">
          <h2 id="assessment-title">现状评估</h2>
          <p className="muted">认读、听写、组词、朗读、看图写作，生成识字量和建议。建议每 4 周一次。</p>
          <div className="button-row">
            <Link className="btn btn-primary" to="/parent/assessment">
              打开现状评估
            </Link>
          </div>
        </section>

        <section className="card" aria-labelledby="limit-title">
          <h2 id="limit-title">每段使用时长</h2>
          <p className="muted">到时间后会提醒孩子休息。</p>
          <div className="segmented" role="group" aria-labelledby="limit-title">
            {SESSION_LIMIT_OPTIONS.map((minutes) => (
              <button
                type="button"
                key={minutes}
                className="btn"
                aria-pressed={settings?.sessionLimitMinutes === minutes}
                onClick={() => updateSettings({ sessionLimitMinutes: minutes })}
              >
                {minutes} 分钟
              </button>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="backup-title">
          <h2 id="backup-title">数据备份</h2>
          <p className="muted">学习数据只保存在这台设备上。建议定期导出备份，换设备时用备份恢复。</p>
          <div className="button-row">
            <button type="button" className="btn" onClick={handleExport}>
              导出备份
            </button>
            <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
              从备份恢复
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="选择备份文件"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void handleImport(file)
              }}
            />
          </div>
          {backupMessage && (
            <p role="status" className={backupMessage.error ? 'error' : 'muted'}>
              {backupMessage.text}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
