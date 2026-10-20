import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../app/useSettings'
import { PinyinText } from '../../components/PinyinText'
import { getSpeaker } from '../../lib/speech'
import { THINK_MS } from '../challenges/logic/focus'
import { detectiveQuestion, type DetectiveQuestion } from '../challenges/logic/generators'
import { useThinkDelay } from '../challenges/useThinkDelay'
import { HanziBoard } from '../handwriting/HanziBoard'
import { KaiChar } from '../handwriting/KaiChar'
import { useDataset } from '../textbook/useDataset'
import type { NewCharPick } from './logic/newChars'
import { allXiezi, completeTask, enrollNewChars, needsWriting, useTodayPlan } from './store'
import { useTaskParam } from './useDaily'
import '../challenges/challenges.css'
import './daily.css'

type Step = 'reading' | 'meaning' | 'reveal' | 'trace'

interface Item extends NewCharPick {
  question: DetectiveQuestion | null
  write: boolean
}

/**
 * 侦察任务（预习下一课）和新字任务：每个字先推理（形声字用部首侦探的线索，其他字先猜再看答案），
 * 要会写的字再描红。新字学完后进入错字 Boss。
 */
export function LearnPage() {
  const task = useTaskParam()
  const ds = useDataset()
  const settings = useSettings()
  const plan = useTodayPlan()
  const [items, setItems] = useState<Item[] | null>(null)
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<Step>('reading')
  const [picked, setPicked] = useState<{ reading?: string; meaning?: string }>({})
  const [finished, setFinished] = useState(false)
  const think = useThinkDelay(`${index}-${step}-${items ? 'on' : 'off'}`, THINK_MS)

  const isNew = task === 'newChars'
  const title = isNew ? '🌱 新字任务' : '🔭 侦察任务'
  const header = (
    <div className="topbar">
      <h1>{title}</h1>
      <Link className="btn btn-quiet" to="/">
        <PinyinText text="回首页" />
      </Link>
    </div>
  )

  if (!ds || !settings || plan === undefined) return <div className="page muted">正在加载…</div>
  const t = plan?.tasks.find((x) => x.id === task && (x.id === 'preview' || x.id === 'newChars'))
  const picks: NewCharPick[] = t ? (isNew ? (t.picks ?? []) : (t.chars ?? []).map((char) => ({ char, source: 'sync' as const }))) : []
  if (!t || !picks.length)
    return (
      <div className="page">
        {header}
        <p className="card">
          <PinyinText text="今天没有这个任务，回首页看看别的任务吧。" />
        </p>
      </div>
    )

  const start = () => {
    const xiezi = allXiezi(ds)
    setItems(
      picks.map((p) => ({
        ...p,
        question: detectiveQuestion(ds, p.char),
        write: isNew && needsWriting(ds, xiezi, p.char, [p.source], settings.extensionWriting),
      })),
    )
    setIndex(0)
    setStep('reading')
    setPicked({})
    setFinished(false)
  }

  if (!items) {
    return (
      <div className="page">
        {header}
        <section className="card game-intro">
          <p className="intro-text">
            <PinyinText
              text={
                isNew
                  ? `今天学 ${picks.length} 个新字。先当侦探推理它怎么读、什么意思，要会写的字再描一描。`
                  : `下一课有新字！先认识其中 ${picks.length} 个，上课时你会认出它们。`
              }
              speak
            />
          </p>
          <button type="button" className="btn btn-primary big-btn" onClick={start}>
            <PinyinText text="开始" />
          </button>
        </section>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="page">
        {header}
        <section className="card round-summary" role="status">
          <div className="summary-emoji" aria-hidden="true">
            {isNew ? '🌱' : '🔭'}
          </div>
          <h2>
            <PinyinText text={isNew ? '新字学会啦！' : '侦察完成！'} />
          </h2>
          <p>
            <PinyinText text={isNew ? '它们会在错字 Boss 里回来找你，帮你记牢。' : '上课时看看能不能认出它们。'} />
          </p>
          <Link className="btn btn-primary big-btn" to="/">
            <PinyinText text="回到今日任务" />
          </Link>
        </section>
      </div>
    )
  }

  const item = items[index]
  const q = item.question
  const info = ds.chars[item.char]
  const reading = info?.py[0] ?? ''

  const reveal = () => {
    setStep('reveal')
    getSpeaker().speak(item.char)
  }

  const next = async () => {
    if (step === 'reveal' && item.write) {
      setStep('trace')
      return
    }
    if (index + 1 < items.length) {
      setIndex(index + 1)
      setStep('reading')
      setPicked({})
      return
    }
    if (isNew) await enrollNewChars(items)
    await completeTask(isNew ? 'newChars' : 'preview')
    setFinished(true)
  }

  const optionState = (option: string, answer: string, chosen?: string) =>
    chosen === undefined ? '' : option === answer ? 'answer' : option === chosen ? 'wrong' : ''

  return (
    <div className="page">
      {header}
      <p className="muted game-progress">
        第 {index + 1} / {items.length} 个字
      </p>
      <section className="card learn-card">
        {step === 'trace' ? (
          <>
            <p className="prompt">
              <PinyinText text="描一描：" />
              <strong>{reading}</strong>
            </p>
            <HanziBoard key={`${item.char}-learn`} char={item.char} mode="trace" onDone={() => void next()} />
          </>
        ) : (
          <>
            <KaiChar char={item.char} size={180} />
            {q && (
              <div className="clues" aria-label="线索">
                <span className="clue clue-semantic">{q.semantic}</span>
                <span className="clue-plus">+</span>
                <span className="clue clue-phonetic">{q.phonetic}</span>
              </div>
            )}

            {q ? (
              <>
                <div className="question">
                  <h2>
                    <PinyinText text="① 它可能读什么？" speak />
                  </h2>
                  <div className="option-row">
                    {q.readingOptions.map((o) => (
                      <button
                        type="button"
                        key={o}
                        className="btn option"
                        data-state={optionState(o, q.reading, picked.reading)}
                        disabled={step !== 'reading' || !think.ready}
                        onClick={() => {
                          setPicked({ reading: o })
                          setStep('meaning')
                        }}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
                {step !== 'reading' && (
                  <div className="question">
                    <h2>
                      <PinyinText text="② 它可能和什么有关？" speak />
                    </h2>
                    <div className="option-row">
                      {q.meaningOptions.map((o) => (
                        <button
                          type="button"
                          key={o}
                          className="btn option option-text"
                          data-state={optionState(o, q.meaning, picked.meaning)}
                          disabled={step !== 'meaning' || !think.ready}
                          onClick={() => {
                            setPicked((p) => ({ ...p, meaning: o }))
                            reveal()
                          }}
                        >
                          <PinyinText text={o} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              step === 'reading' && (
                <>
                  <p className="prompt">
                    <PinyinText text="猜一猜，它怎么读？想好了再看答案。" speak />
                  </p>
                  <button type="button" className="btn btn-primary big-btn" disabled={!think.ready} onClick={reveal}>
                    <PinyinText text="看答案" />
                  </button>
                </>
              )
            )}

            {step === 'reveal' && (
              <div className="reveal" role="status">
                <div className="pinyin-big" data-testid="learn-reading">
                  {reading}
                </div>
                {q && (
                  <p className="reveal-text">
                    <strong>{q.semantic}</strong> <PinyinText text={`表示意思：${q.meaning}；`} />
                    <strong>{q.phonetic}</strong> <PinyinText text="提示读音。" />
                  </p>
                )}
                {!!info?.words.length && (
                  <p className="learn-words">
                    <PinyinText text={`组词：${info.words.slice(0, 3).join('、')}`} />
                  </p>
                )}
                <button type="button" className="btn btn-primary big-btn" onClick={() => void next()}>
                  <PinyinText text={item.write ? '描一描' : index + 1 < items.length ? '下一个字' : '完成'} />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
