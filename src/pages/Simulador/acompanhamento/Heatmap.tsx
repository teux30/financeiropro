import { useMemo } from 'react'
import type { Objetivo, AporteReal } from '../../../store/objetivoTypes'
import { heatmapDias } from '../../../store/objetivoSelectors'
import { fmtBRL } from '../../../lib/format'

/** Heatmap estilo GitHub: colunas = semanas, linhas = dias da semana */
export function Heatmap({ objetivo, aportes }: { objetivo: Objetivo; aportes: AporteReal[] }) {
  const dias = useMemo(() => heatmapDias(objetivo, aportes, 119), [objetivo, aportes])
  const maxVal = useMemo(() => Math.max(1, ...dias.map(d => d.valor)), [dias])

  const cor = (v: number) => {
    if (v <= 0) return '#161b22'
    const t = v / maxVal
    if (t < 0.25) return '#1d9e7544'
    if (t < 0.5) return '#1d9e7588'
    if (t < 0.75) return '#1d9e75bb'
    return '#1d9e75'
  }

  // agrupa em colunas de 7 (semanas)
  const semanas: { data: string; valor: number }[][] = []
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7))

  const totalDias = dias.filter(d => d.valor > 0).length

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-[#e6edf3]">Consistência</h2>
        <span className="text-xs text-[#8b949e]">{totalDias} dias com aporte (últimos 120)</span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {semanas.map((sem, i) => (
            <div key={i} className="flex flex-col gap-1">
              {sem.map(d => (
                <div key={d.data} className="w-3 h-3 rounded-sm"
                  style={{ background: cor(d.valor) }}
                  title={`${new Date(d.data).toLocaleDateString('pt-BR')}${d.valor > 0 ? ` · ${fmtBRL(d.valor)}` : ' · sem aporte'}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-xs text-[#8b949e]">
        <span>menos</span>
        {['#161b22', '#1d9e7544', '#1d9e7588', '#1d9e75bb', '#1d9e75'].map(c => (
          <div key={c} className="w-3 h-3 rounded-sm" style={{ background: c }} />
        ))}
        <span>mais</span>
      </div>
    </div>
  )
}
