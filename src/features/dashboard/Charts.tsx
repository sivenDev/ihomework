import { CURVE_SERIES, type CurvePoint } from './logic/metrics'

const W = 640
const H = 240
const PAD = { left: 48, right: 16, top: 16, bottom: 32 }

/** 坐标轴上限取整到 50 / 100 / 500 的倍数。 */
function niceMax(n: number): number {
  const step = n <= 200 ? 50 : n <= 1000 ? 100 : 500
  return Math.max(step, Math.ceil((n * 1.1) / step) * step)
}

const shortDate = (d: string) => d.slice(5).replace('-', '/')

/** 识字量曲线：三条线，横轴为每次评估和周 Boss 的日期。手写 SVG，宽度随容器缩放。 */
export function LiteracyChart({ points }: { points: CurvePoint[] }) {
  const max = niceMax(Math.max(...points.flatMap((p) => [p.recognition, p.writing ?? 0, p.extension])))
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH
  const ticks = [0, max / 2, max]
  const labelEvery = Math.ceil(points.length / 8)
  const latest = points.at(-1)!

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`识字量曲线，最近一次：课内认读 ${latest.recognition} 字，课内会写 ${latest.writing ?? '暂无'}，课外识字 ${latest.extension} 字`}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line className="chart-grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
          <text className="chart-label" x={PAD.left - 8} y={y(t) + 5} textAnchor="end">
            {t}
          </text>
        </g>
      ))}
      {points.map((p, i) =>
        i % labelEvery === 0 || i === points.length - 1 ? (
          <text key={`${p.date}-${i}`} className="chart-label" x={x(i)} y={H - 8} textAnchor="middle">
            {shortDate(p.date)}
            {p.source === 'assessment' ? '★' : ''}
          </text>
        ) : null,
      )}
      {CURVE_SERIES.map((s) => {
        const pts = points.map((p, i) => ({ i, v: p[s.key] })).filter((p): p is { i: number; v: number } => p.v !== null)
        return (
          <g key={s.key} className={`series-${s.key}`}>
            <polyline className="chart-line" points={pts.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')} />
            {pts.map((p) => (
              <circle key={p.i} className="chart-dot" cx={x(p.i)} cy={y(p.v)} r={4} />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

/** 近 7 天每日用时柱状图。 */
export function UsageBars({ days }: { days: { date: string; minutes: number }[] }) {
  const h = 160
  const top = 24
  const bottom = 28
  const w = 300
  const slot = w / days.length
  const max = Math.max(30, ...days.map((d) => d.minutes))
  const barH = (m: number) => ((h - top - bottom) * m) / max
  return (
    <svg className="chart usage-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`近 7 天用时：${days.map((d) => `${shortDate(d.date)} ${d.minutes} 分钟`).join('，')}`}>
      {days.map((d, i) => (
        <g key={d.date} data-testid="usage-bar" data-minutes={d.minutes}>
          <rect className="usage-bar" x={i * slot + slot * 0.2} width={slot * 0.6} y={h - bottom - barH(d.minutes)} height={Math.max(barH(d.minutes), 1)} rx={4} />
          <text className="chart-label" x={i * slot + slot / 2} y={h - bottom - barH(d.minutes) - 6} textAnchor="middle">
            {d.minutes}
          </text>
          <text className="chart-label" x={i * slot + slot / 2} y={h - 8} textAnchor="middle">
            {shortDate(d.date)}
          </text>
        </g>
      ))}
    </svg>
  )
}
