import { useState } from 'react'
import {
  ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { fmtK, fmtBRL, buildChartData, calcCapitalNecessario } from './math'

type ChartMode = 'bar' | 'line' | 'area'
const HORIZON_OPTIONS = [5, 10, 15, 20, 30]

interface Props {
  inicial: number
  mensal: number
  yieldMensal: number
  meta: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="glass rounded-xl p-3 text-xs shadow-2xl min-w-[180px]">
      <p className="font-semibold text-[#e6edf3] mb-2">{label}</p>
      <div className="flex flex-col gap-1 text-[#8b949e]">
        <div className="flex justify-between gap-4">
          <span>Patrimônio</span>
          <span className="text-[#10b981] font-semibold">{fmtBRL(d.patrimonio)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Renda/mês</span>
          <span className="text-[#e6edf3]">{fmtBRL(d.rendaMensal)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Total aportado</span>
          <span className="text-[#e6edf3]">{fmtBRL(d.totalAportado)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Rendimentos</span>
          <span className="text-[#f59e0b]">{fmtBRL(d.rendimentos)}</span>
        </div>
      </div>
    </div>
  )
}

export function PatrimonioChart({ inicial, mensal, yieldMensal, meta }: Props) {
  const [mode, setMode] = useState<ChartMode>('bar')
  const [horizon, setHorizon] = useState(10)
  const [showMeta, setShowMeta] = useState(true)

  const data = buildChartData(inicial, mensal, yieldMensal, horizon)
  const capitalMeta = calcCapitalNecessario(meta, yieldMensal)

  const MODES: { id: ChartMode; label: string }[] = [
    { id: 'bar', label: 'Barras' },
    { id: 'line', label: 'Linha' },
    { id: 'area', label: 'Área' },
  ]

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-base font-semibold text-[#e6edf3]">Crescimento do patrimônio</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Horizonte */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#8b949e]">Horizonte:</span>
            {HORIZON_OPTIONS.map(y => (
              <button
                key={y}
                onClick={() => setHorizon(y)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  horizon === y
                    ? 'bg-[#10b981] text-white'
                    : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                {y}a
              </button>
            ))}
          </div>
          {/* Modo */}
          <div className="flex bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-3 py-1 text-xs transition-colors ${
                  mode === m.id
                    ? 'bg-[#10b981] text-white'
                    : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {/* Toggle meta */}
          <button
            onClick={() => setShowMeta(v => !v)}
            className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
              showMeta
                ? 'border-[#ef4444] text-[#ef4444] bg-[#ef444411]'
                : 'border-[#30363d] text-[#8b949e]'
            }`}
          >
            Linha da meta
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#8b949e', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={v => fmtK(v)}
            tick={{ fill: '#8b949e', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

          {mode === 'bar' && (
            <Bar dataKey="patrimonio" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
          )}
          {mode === 'line' && (
            <Line dataKey="patrimonio" stroke="#10b981" strokeWidth={2.5} dot={false} />
          )}
          {mode === 'area' && (
            <Area
              dataKey="patrimonio"
              stroke="#10b981"
              strokeWidth={2}
              fill="#10b98122"
              dot={false}
            />
          )}

          {showMeta && isFinite(capitalMeta) && (
            <ReferenceLine
              y={capitalMeta}
              stroke="#ef4444"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: 'Meta', fill: '#ef4444', fontSize: 11, position: 'insideTopRight' }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
