import { useState } from 'react'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import { buildProjecao, fmtBRL, fmtK } from './math'

interface Props {
  inicial: number
  mensal: number
  yieldMensal: number
  meta: number
}

export function ProjecaoTable({ inicial, mensal, yieldMensal, meta }: Props) {
  const [anos, setAnos] = useState(10)
  const [expanded, setExpanded] = useState(true)
  const rows = buildProjecao(inicial, mensal, yieldMensal, meta, anos)

  const exportCSV = () => {
    const header = 'Ano,Patrimônio,Total Aportado,Rendimentos,Renda/mês,% da Meta'
    const lines = rows.map(r =>
      [r.ano, r.patrimonio.toFixed(2), r.totalAportado.toFixed(2),
       r.rendimentos.toFixed(2), r.rendaMensal.toFixed(2), r.pctMeta.toFixed(1)].join(',')
    )
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `projecao-renda-passiva-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 text-base font-semibold text-[#e6edf3] hover:text-[#10b981] transition-colors"
        >
          Projeção ano a ano
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className="flex items-center gap-3">
          <select
            value={anos}
            onChange={e => setAnos(Number(e.target.value))}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-sm text-[#8b949e] focus:outline-none focus:border-[#10b981]"
          >
            {[5, 10, 15, 20, 30].map(y => <option key={y} value={y}>{y} anos</option>)}
          </select>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-xs text-[#8b949e] hover:text-[#e6edf3] rounded-lg transition-colors"
          >
            <Download size={13} /> Exportar CSV
          </button>
        </div>
      </div>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#21262d]">
                {['Ano', 'Patrimônio', 'Total Aportado', 'Rendimentos', 'Renda/mês', '% da Meta'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-[#8b949e] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const atingiu = r.rendaMensal >= meta
                return (
                  <tr
                    key={r.ano}
                    className={`border-b border-[#21262d] last:border-0 transition-colors ${
                      atingiu ? 'bg-[#10b98108] hover:bg-[#10b98112]' : 'hover:bg-[#1c2128]'
                    }`}
                  >
                    <td className="px-6 py-3 text-[#e6edf3] font-medium">{r.ano}</td>
                    <td className={`px-6 py-3 font-semibold ${atingiu ? 'text-[#10b981]' : 'text-[#e6edf3]'}`}>
                      {fmtK(r.patrimonio)}
                    </td>
                    <td className="px-6 py-3 text-[#8b949e]">{fmtK(r.totalAportado)}</td>
                    <td className="px-6 py-3 text-[#f59e0b]">{fmtK(r.rendimentos)}</td>
                    <td className={`px-6 py-3 font-semibold ${atingiu ? 'text-[#10b981]' : 'text-[#e6edf3]'}`}>
                      {fmtBRL(r.rendaMensal)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#21262d] rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, r.pctMeta)}%`,
                              backgroundColor: atingiu ? '#10b981' : '#3b82f6',
                            }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${atingiu ? 'text-[#10b981]' : 'text-[#8b949e]'}`}>
                          {r.pctMeta.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
