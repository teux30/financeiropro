import { ComposedChart, Area, Line, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Objetivo, AporteReal } from '../../../store/objetivoTypes'
import { dadosGrafico } from '../../../store/objetivoSelectors'
import { fmtBRL, fmtBRLshort } from '../../../lib/format'

export function EvolucaoChart({ objetivo, aportes }: { objetivo: Objetivo; aportes: AporteReal[] }) {
  const data = dadosGrafico(objetivo, aportes)
  const meta = data[0]?.meta ?? 0

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 sm:p-6">
      <h2 className="text-base font-semibold text-[#e6edf3] mb-1">Evolução: real vs planejado</h2>
      <p className="text-xs text-[#8b949e] mb-4">Linha verde = o que você guardou · azul = plano · tracejada = meta</p>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d9e75" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#1d9e75" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 8))} />
          <YAxis tickFormatter={v => fmtBRLshort(v)} tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
          <Tooltip
            contentStyle={{ background: '#141a14', border: '1px solid #30363d', borderRadius: 8 }}
            labelStyle={{ color: '#e6edf3' }}
            formatter={(v, n) => [fmtBRL(Number(v)), n === 'real' ? 'Real' : n === 'planejado' ? 'Planejado' : 'Meta']}
          />
          <Area type="monotone" dataKey="real" stroke="#1d9e75" strokeWidth={2.5} fill="url(#gReal)" name="real" />
          <Line type="monotone" dataKey="planejado" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 4" dot={false} name="planejado" />
          {isFinite(meta) && meta > 0 && (
            <ReferenceLine y={meta} stroke="#ef4444" strokeDasharray="6 4" strokeWidth={1.5}
              label={{ value: 'Meta', fill: '#ef4444', fontSize: 11, position: 'insideTopRight' }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
