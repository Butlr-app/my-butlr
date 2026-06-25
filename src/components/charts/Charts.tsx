// Lightweight monochrome SVG charts. No external dependencies.

function formatCompact(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

export interface ChartDatum {
  label: string
  value: number
}

export function BarChart({ data, label }: { data: ChartDatum[]; label?: string }) {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const barWidth = Math.max(20, Math.floor(280 / Math.max(data.length, 1)) - 8)

  return (
    <div className="w-full">
      {label && (
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground mb-3">{label}</p>
      )}
      <svg viewBox={`0 0 ${Math.max(data.length * (barWidth + 8), 100)} 160`} className="w-full h-40" preserveAspectRatio="xMidYMid meet">
        {data.map((d, i) => {
          const barHeight = (d.value / maxVal) * 120
          const x = i * (barWidth + 8) + 4
          const y = 130 - barHeight
          return (
            <g key={d.label + i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="currentColor"
                className="text-foreground/70"
                rx={3}
              >
                <animate attributeName="height" from="0" to={barHeight} dur="0.6s" fill="freeze" />
                <animate attributeName="y" from="130" to={y} dur="0.6s" fill="freeze" />
              </rect>
              <text x={x + barWidth / 2} y={148} textAnchor="middle" className="fill-muted-foreground" fontSize="8" fontFamily="monospace">
                {d.label}
              </text>
              <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" className="fill-foreground" fontSize="8" fontFamily="monospace">
                {d.value > 0 ? formatCompact(d.value) : ''}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function LineChart({ data, label }: { data: ChartDatum[]; label?: string }) {
  if (data.length === 0) return null
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const width = 300
  const height = 120
  const padding = 20
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  const points = data.map((d, i) => ({
    x: padding + (i / Math.max(data.length - 1, 1)) * chartWidth,
    y: padding + chartHeight - (d.value / maxVal) * chartHeight,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`

  return (
    <div className="w-full">
      {label && (
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground mb-3">{label}</p>
      )}
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full h-36" preserveAspectRatio="xMidYMid meet">
        <path d={areaD} fill="currentColor" className="text-foreground/10" />
        <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground/70" />
        {points.map((p, i) => (
          <circle key={data[i].label + i} cx={p.x} cy={p.y} r="3" fill="currentColor" className="text-foreground" />
        ))}
        {data.map((d, i) => (
          <text key={d.label + i} x={points[i].x} y={height + 12} textAnchor="middle" className="fill-muted-foreground" fontSize="8" fontFamily="monospace">
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

export interface DonutSegment {
  label: string
  value: number
}

// Monochrome donut using varying opacity for segments.
export function DonutChart({ data, label, centerLabel, centerValue }: {
  data: DonutSegment[]
  label?: string
  centerLabel?: string
  centerValue?: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const size = 160
  const stroke = 22
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="w-full">
      {label && (
        <p className="text-xs font-mono font-medium uppercase tracking-[.14em] text-muted-foreground mb-3">{label}</p>
      )}
      <div className="flex items-center gap-6">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-36 h-36 shrink-0 -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted" />
          {total > 0 && data.map((d, i) => {
            const fraction = d.value / total
            const dash = fraction * circumference
            const seg = (
              <circle
                key={d.label + i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                className="text-foreground"
                style={{ opacity: 1 - i * (0.6 / Math.max(data.length - 1, 1)) }}
              />
            )
            offset += dash
            return seg
          })}
        </svg>
        <div className="flex-1 space-y-2">
          {(centerLabel || centerValue) && (
            <div className="mb-3">
              {centerValue && <p className="text-2xl font-mono font-semibold">{centerValue}</p>}
              {centerLabel && <p className="text-xs text-muted-foreground">{centerLabel}</p>}
            </div>
          )}
          {data.map((d, i) => (
            <div key={d.label + i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-foreground shrink-0" style={{ opacity: 1 - i * (0.6 / Math.max(data.length - 1, 1)) }} />
                <span className="text-sm truncate">{d.label}</span>
              </div>
              <span className="text-sm font-mono text-muted-foreground shrink-0">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
