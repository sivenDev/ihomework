import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PinyinText } from '../../components/PinyinText'
import { StoredImage } from '../../components/StoredImage'
import { db } from '../../db/schema'
import { saveImage } from '../assessment/store'
import { useDataset } from '../textbook/useDataset'
import { CLUES, nextStep, previousStep, splitSentences, STEP_NAMES, STEPS, stepComplete, storySlots, type WritingData } from './logic/flow'
import { HITS_TO_LEVEL_UP, MAX_WRITING_LEVEL, SENTENCE_LADDER, WRITING_LADDER, type WritingLevel } from './logic/levels'
import { discardWriting, startWriting, submitWriting, updateWriting, useDraft, useWritings, useWritingStatus, type Writing } from './store'
import './writing.css'

type Save = (change: (d: WritingData) => WritingData) => void

const RESULT_TEXT = { none: '这次还没达到目标', level: '达到目标 ✓', challenge: '达到挑战目标 🌟' } as const

function Header() {
  return (
    <div className="topbar">
      <h1>🕵️ 侦探看图写作</h1>
      <Link className="btn btn-quiet" to="/">
        <PinyinText text="回首页" />
      </Link>
    </div>
  )
}

/** 输入框：自己保存正在输入的文字，每次修改都存进数据库（中途退出后可以继续）。 */
function DraftField({ value, label, rows = 2, onChange }: { value: string | undefined; label: string; rows?: number; onChange: (v: string) => void }) {
  const [text, setText] = useState(value ?? '')
  return (
    <textarea
      className="text-field"
      aria-label={label}
      rows={rows}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        onChange(e.target.value)
      }}
    />
  )
}

function LevelGoal({ level }: { level: WritingLevel }) {
  const ladder = WRITING_LADDER[level]
  return (
    <>
      <p>
        <strong>
          <PinyinText text={`${level} 级目标：${ladder.goal}`} />
        </strong>
      </p>
      <p className="muted">
        <PinyinText text={`提示：${ladder.tip}`} />
      </p>
      <details className="writing-example">
        <summary>
          <PinyinText text="看看示例" />
        </summary>
        <PinyinText text={ladder.example} />
      </details>
    </>
  )
}

/** 孩子的看图写作：没有草稿时显示等级和历史；有草稿时从上次停下的那一步继续。 */
export function WritingCasePage() {
  const ds = useDataset()
  const draft = useDraft()
  const writings = useWritings()
  const status = useWritingStatus()
  const [submitted, setSubmitted] = useState(false)

  if (!ds || draft === undefined || !writings || !status) return <div className="page muted">正在加载…</div>
  if (draft) return <WritingFlow key={draft.id} writing={draft} onSubmitted={() => setSubmitted(true)} />

  const waiting = writings.filter((w) => w.data.status === 'submitted')
  const history = writings.filter((w) => w.data.status === 'scored')
  return (
    <div className="page">
      <Header />
      {submitted && (
        <p className="card today-complete" role="status">
          🎉 <PinyinText text="报告已经交给家长评分啦！" />
        </p>
      )}
      <section className="card writing-level" aria-label="我的写作等级">
        <h2 data-testid="writing-level">
          <PinyinText text={`我的写作等级：${status.level} 级`} />
        </h2>
        <LevelGoal level={status.level} />
        {status.level < MAX_WRITING_LEVEL && (
          <p className="muted" data-testid="writing-hits">
            <PinyinText text={`这一级已经达标 ${status.hits} 次，达标 ${HITS_TO_LEVEL_UP} 次可以升级`} />
          </p>
        )}
        <button type="button" className="btn btn-primary big-btn" onClick={() => void startWriting(ds)}>
          <PinyinText text="开始新案件" />
        </button>
      </section>

      {waiting.length > 0 && (
        <section className="card writing-section">
          <h2>
            <PinyinText text="等家长评分" />
          </h2>
          <ul className="writing-history">
            {waiting.map((w) => (
              <li key={w.id}>
                {w.data.submittedOn ?? w.date} · {w.data.level} 级
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section className="card writing-section">
          <h2>
            <PinyinText text="我的写作" />
          </h2>
          <ul className="writing-history">
            {history.map((w) => (
              <li key={w.id} data-testid="my-writing">
                {w.data.score!.date} · {w.data.level} 级 · {w.data.score!.total} / 15 分 · <PinyinText text={RESULT_TEXT[w.data.score!.result]} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function WritingFlow({ writing, onSubmitted }: { writing: Writing; onSubmitted: () => void }) {
  const { id, data } = writing
  const step = data.step
  const save: Save = (change) => void updateWriting(id, change)
  const go = (s: WritingData['step']) => save((d) => ({ ...d, step: s }))
  const prev = previousStep(step)
  const next = nextStep(step)
  const ok = stepComplete(data, step)

  return (
    <div className="page">
      <Header />
      <ol className="step-bar" aria-label="写作步骤">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={s === step ? 'step' : undefined} data-done={STEPS.indexOf(step) > i}>
            <PinyinText text={`${i + 1}. ${STEP_NAMES[s]}`} />
          </li>
        ))}
      </ol>

      <section className="card writing-goal">
        <LevelGoal level={data.level} />
        {data.goal > data.level && (
          <p className="notice" data-testid="writing-challenge">
            🌟 <PinyinText text={`挑战目标（${data.goal} 级）：${WRITING_LADDER[data.goal].goal}`} />
          </p>
        )}
      </section>

      {step !== 'images' && (
        <div className="writing-images" aria-label="写作图片">
          {data.imageIds.map((img, i) => (
            <StoredImage key={img} id={img} alt={`第 ${i + 1} 幅图`} className="writing-thumb" />
          ))}
        </div>
      )}

      <section className="card writing-step" data-testid={`step-${step}`}>
        {step === 'images' && <ImagesStep data={data} save={save} />}
        {step === 'clues' && <CluesStep data={data} save={save} />}
        {step === 'reason' && <ReasonStep data={data} save={save} />}
        {step === 'report' && <ReportStep data={data} save={save} />}
        {step === 'upgrade' && <UpgradeStep data={data} save={save} />}
      </section>

      <div className="button-row writing-nav">
        {prev && (
          <button type="button" className="btn big-btn" onClick={() => go(prev)}>
            <PinyinText text="上一步" />
          </button>
        )}
        {next ? (
          <button type="button" className="btn btn-primary big-btn" disabled={!ok} onClick={() => go(next)}>
            <PinyinText text="下一步" />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary big-btn"
            disabled={!ok}
            onClick={async () => {
              await submitWriting(id)
              onSubmitted()
            }}
          >
            <PinyinText text="交给家长评分" />
          </button>
        )}
      </div>
      <p className="muted writing-resume">
        <PinyinText text="写到一半可以先回首页，下次会接着写。" />{' '}
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            if (window.confirm('确定不要这篇了吗？写过的内容会删掉。')) void discardWriting(id)
          }}
        >
          放弃这篇
        </button>
      </p>
    </div>
  )
}

function ImagesStep({ data, save }: { data: WritingData; save: Save }) {
  const add = async (files: File[]) => {
    const ids = await Promise.all(files.map((f) => saveImage(f)))
    save((d) => ({ ...d, imageIds: [...d.imageIds, ...ids] }))
  }
  return (
    <>
      <h2>
        <PinyinText text="看图：今天的案件现场" speak />
      </h2>
      <p>
        <PinyinText text="请家长拍照或者从相册选图，可以选好几幅（按故事的顺序）。" />
      </p>
      <label className="btn btn-primary">
        📷 <PinyinText text={data.imageIds.length ? '再加一幅' : '添加图片'} />
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label="添加写作图片"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])]
            e.target.value = ''
            if (files.length) void add(files)
          }}
        />
      </label>
      {data.imageIds.length > 0 && (
        <ul className="writing-images">
          {data.imageIds.map((img, i) => (
            <li key={img} className="writing-image-item">
              <StoredImage id={img} alt={`第 ${i + 1} 幅图`} className="writing-thumb" />
              <button
                type="button"
                className="btn btn-quiet"
                aria-label={`删掉第 ${i + 1} 幅图`}
                onClick={() => {
                  save((d) => ({ ...d, imageIds: d.imageIds.filter((x) => x !== img) }))
                  void db.blobs.delete(img)
                }}
              >
                删掉
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function CluesStep({ data, save }: { data: WritingData; save: Save }) {
  const [index, setIndex] = useState(() => Math.max(0, CLUES.findIndex((c) => !data.clues[c.key]?.trim())))
  const clue = CLUES[index]
  const filled = !!data.clues[clue.key]?.trim()
  return (
    <>
      <h2>
        <PinyinText text={`找线索 ${index + 1} / ${CLUES.length}：${clue.label}`} />
      </h2>
      <p className="writing-question">
        <PinyinText text={clue.question} speak />
      </p>
      <DraftField key={clue.key} value={data.clues[clue.key]} label={clue.label} onChange={(v) => save((d) => ({ ...d, clues: { ...d.clues, [clue.key]: v } }))} />
      <p className="muted">
        <PinyinText text="可以自己打字，也可以说给家长听，请家长帮忙记下来。" />
      </p>
      <div className="button-row">
        {index > 0 && (
          <button type="button" className="btn" onClick={() => setIndex(index - 1)}>
            <PinyinText text="上一条线索" />
          </button>
        )}
        {index < CLUES.length - 1 && (
          <button type="button" className="btn" disabled={!filled} onClick={() => setIndex(index + 1)}>
            <PinyinText text="下一条线索" />
          </button>
        )}
      </div>
      <ClueSummary data={data} />
    </>
  )
}

function ClueSummary({ data }: { data: WritingData }) {
  return (
    <ul className="clue-list" aria-label="找到的线索">
      {CLUES.map((c) => (
        <li key={c.key} data-found={!!data.clues[c.key]?.trim()}>
          <strong>{c.label}</strong>：{data.clues[c.key]?.trim() || '？'}
        </li>
      ))}
    </ul>
  )
}

function ReasonStep({ data, save }: { data: WritingData; save: Save }) {
  const slots = storySlots(data.imageIds.length)
  const single = data.imageIds.length <= 1
  return (
    <>
      <h2>
        <PinyinText text="推理：把线索串成故事" speak />
      </h2>
      <p>
        <PinyinText text={single ? '用“因为……所以……结果……”说一说发生了什么。' : '每幅图写一句话，连起来就是一个故事。'} />
      </p>
      <ClueSummary data={data} />
      <div className="story-slots">
        {slots.map((label, i) => (
          <label key={label} className="story-slot">
            {!single && <StoredImage id={data.imageIds[i]} alt={label} className="writing-thumb" />}
            <span className="story-label">
              <PinyinText text={single ? `${label}……` : label} />
            </span>
            <DraftField
              value={data.story[i]}
              label={label}
              onChange={(v) =>
                save((d) => {
                  const story = [...d.story]
                  story[i] = v
                  return { ...d, story }
                })
              }
            />
          </label>
        ))}
      </div>
    </>
  )
}

function storyLine(data: WritingData): string {
  const s = data.story.map((x) => x?.trim() ?? '')
  return data.imageIds.length <= 1 ? `因为${s[0]}，所以${s[1]}，结果${s[2]}。` : s.join(' ')
}

function ReportStep({ data, save }: { data: WritingData; save: Save }) {
  const upload = async (file: File) => {
    const photoId = await saveImage(file)
    save((d) => ({ ...d, report: { ...d.report, photoId } }))
  }
  return (
    <>
      <h2>
        <PinyinText text="写报告" speak />
      </h2>
      <p className="notice">
        <PinyinText text={`你的故事线：${storyLine(data)}`} />
      </p>
      <p>
        <PinyinText text="在纸上写好拍下来，或者直接在下面写。" />
      </p>
      <DraftField value={data.report.text} label="我的报告" rows={8} onChange={(v) => save((d) => ({ ...d, report: { ...d.report, text: v } }))} />
      <label className="btn">
        📷 <PinyinText text={data.report.photoId ? '重拍纸上的报告' : '拍下纸上写的报告'} />
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="上传作文照片"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void upload(file)
          }}
        />
      </label>
      {data.report.photoId && <StoredImage id={data.report.photoId} alt="纸上的报告" className="writing-thumb" />}
    </>
  )
}

function UpgradeStep({ data, save }: { data: WritingData; save: Save }) {
  const sentences = splitSentences(data.report.text)
  const { sentence, selfLevel } = data.upgrade
  const target = selfLevel ? Math.min(selfLevel + 1, 4) : null
  const setUpgrade = (patch: Partial<WritingData['upgrade']>) => save((d) => ({ ...d, upgrade: { ...d.upgrade, ...patch } }))
  return (
    <>
      <h2>
        <PinyinText text="句子升级" speak />
      </h2>
      <ol className="sentence-ladder" aria-label="句子等级示例">
        {SENTENCE_LADDER.map((s) => (
          <li key={s.level}>
            <strong>{s.level} 级</strong> <PinyinText text={s.text} /> <span className="muted">（{s.note}）</span>
          </li>
        ))}
      </ol>

      <h3>
        <PinyinText text="① 选一句你写的话" />
      </h3>
      {sentences.length > 0 ? (
        <div className="segmented sentence-picks">
          {sentences.map((s) => (
            <button key={s} type="button" className="btn" aria-pressed={sentence === s} onClick={() => setUpgrade({ sentence: s })}>
              {s}
            </button>
          ))}
        </div>
      ) : (
        <DraftField value={sentence} label="要升级的句子" onChange={(v) => setUpgrade({ sentence: v })} />
      )}

      <h3>
        <PinyinText text="② 这句是几级？" />
      </h3>
      <div className="segmented">
        {([1, 2, 3, 4] as const).map((n) => (
          <button key={n} type="button" className="btn" aria-pressed={selfLevel === n} onClick={() => setUpgrade({ selfLevel: n })}>
            {n} 级
          </button>
        ))}
      </div>

      {target && (
        <>
          <h3>
            <PinyinText text={selfLevel === 4 ? '③ 再加一个比喻或者好词' : `③ 升一级：改成 ${target} 级`} />
          </h3>
          <DraftField value={data.upgrade.rewrite} label="改写后的句子" onChange={(v) => setUpgrade({ rewrite: v })} />
        </>
      )}
    </>
  )
}
