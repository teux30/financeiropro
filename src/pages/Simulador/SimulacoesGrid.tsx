import { useState } from 'react'
import { PlayCircle, GitBranch, Trash2, Map, Calendar, Target, Clock } from 'lucide-react'
import { useStore, type SimulacaoSalva } from '../../store/useStore'
import { fmtBRL, formatPrazo } from './math'

type Sort = 'recente' | 'meta' | 'prazo'

interface Props {
  onExportMindMap: (projectId: string) => void
}

export function SimulacoesGrid({ onExportMindMap }: Props) {
  const { simulacoesSalvas, carregarSimulacao, excluirSimulacao, exportarParaMapaMental } = useStore()
  const [sort, setSort] = useState<Sort>('recente')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  if (simulacoesSalvas.length === 0) return null

  const sorted = [...simulacoesSalvas].sort((a, b) => {
    if (sort === 'recente') return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime()
    if (sort === 'meta')    return b.parametros.metaMensal - a.parametros.metaMensal
    if (sort === 'prazo')   return (isFinite(a.resultados.prazoMeses) ? a.resultados.prazoMeses : 9999)
                                 - (isFinite(b.resultados.prazoMeses) ? b.resultados.prazoMeses : 9999)
    return 0
  })

  const handleExport = (id: string) => {
    const projectId = exportarParaMapaMental(id)
    if (projectId) onExportMindMap(projectId)
  }

  const handleOpenMindMap = (sim: SimulacaoSalva) => {
    if (sim.projetoId) {
      onExportMindMap(sim.projetoId)
    } else {
      handleExport(sim.id)
    }
  }

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
        <h2 className="text-base font-semibold text-[#e6edf3]">
          Simulações salvas
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#21262d] text-[#8b949e]">
            {simulacoesSalvas.length}/10
          </span>
        </h2>
        <div className="flex items-center gap-2 text-xs text-[#8b949e]">
          Ordenar:
          {(['recente', 'meta', 'prazo'] as Sort[]).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-2 py-1 rounded transition-colors ${
                sort === s ? 'text-[#1d9e75]' : 'hover:text-[#e6edf3]'
              }`}
            >
              {s === 'recente' ? 'Mais recente' : s === 'meta' ? 'Maior meta' : 'Menor prazo'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map(sim => (
          <SimCard
            key={sim.id}
            sim={sim}
            confirmingDelete={confirmDelete === sim.id}
            onLoad={() => carregarSimulacao(sim.id)}
            onDelete={() => setConfirmDelete(sim.id)}
            onConfirmDelete={() => { excluirSimulacao(sim.id); setConfirmDelete(null) }}
            onCancelDelete={() => setConfirmDelete(null)}
            onMindMap={() => handleOpenMindMap(sim)}
          />
        ))}
      </div>
    </div>
  )
}

function SimCard({
  sim, confirmingDelete, onLoad, onDelete, onConfirmDelete, onCancelDelete, onMindMap,
}: {
  sim: SimulacaoSalva
  confirmingDelete: boolean
  onLoad: () => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onMindMap: () => void
}) {
  const hasMindMap = !!sim.projetoId

  if (confirmingDelete) {
    return (
      <div className="border border-[#da363344] bg-[#1a0808] rounded-xl p-4 flex flex-col gap-3">
        <p className="text-sm text-[#f85149]">Excluir <strong>"{sim.nome}"</strong>?</p>
        <div className="flex gap-2">
          <button onClick={onCancelDelete} className="flex-1 py-1.5 text-xs rounded-lg bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3] transition-colors">Cancelar</button>
          <button onClick={onConfirmDelete} className="flex-1 py-1.5 text-xs rounded-lg bg-[#da3633] hover:bg-[#f85149] text-white transition-colors">Excluir</button>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-[#21262d] hover:border-[#30363d] rounded-xl p-4 transition-all group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#e6edf3] truncate">{sim.nome}</p>
          {sim.descricao && <p className="text-xs text-[#484f58] truncate mt-0.5">{sim.descricao}</p>}
        </div>
        {hasMindMap && (
          <span className="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium" style={{ color: '#1d9e75', background: '#1d9e7520' }}>
            <Map size={10} className="inline mr-0.5" />Mapa
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[#484f58] flex items-center gap-1"><Target size={9} /> Meta</span>
          <span className="text-xs font-semibold text-[#1d9e75]">{fmtBRL(sim.parametros.metaMensal)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[#484f58] flex items-center gap-1"><Clock size={9} /> Prazo</span>
          <span className="text-xs font-semibold text-[#e6edf3]">{formatPrazo(sim.resultados.prazoMeses)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[#484f58]">Renda 3a</span>
          <span className="text-xs font-semibold text-[#3b82f6]">{fmtBRL(sim.resultados.rendaEm3Anos)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[#484f58] flex items-center gap-1">
          <Calendar size={10} />
          {new Date(sim.dataCriacao).toLocaleDateString('pt-BR')}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onMindMap}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#1d9e75] hover:bg-[#1d9e7515] transition-colors"
            title={hasMindMap ? 'Ver no Mapa Mental' : 'Exportar como Mapa Mental'}
          >
            <GitBranch size={13} />
          </button>
          <button
            onClick={onLoad}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#388bfd] hover:bg-[#1f6feb15] transition-colors"
            title="Carregar parâmetros"
          >
            <PlayCircle size={13} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#ef4444] hover:bg-[#ef444415] transition-colors"
            title="Excluir"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
