import { useState } from 'react'
import { Save, GitBranch, ChevronRight } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Input, Textarea } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useStore } from '../../store/useStore'
import { fmtBRL, fmtK, formatPrazo, toYieldMensal, calcCapitalNecessario, calcPrazoMeses } from './math'

interface Props {
  open: boolean
  onClose: () => void
  onExportMindMap?: (projectId: string) => void
}

export function SaveModal({ open, onClose, onExportMindMap }: Props) {
  const { simParams, simAlocacao, simulacoesSalvas, salvarSimulacao, exportarParaMapaMental } = useStore()
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [saved, setSaved] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const { inicial, mensal, yieldAnual, meta } = simParams
  const ym = toYieldMensal(yieldAnual)
  const capital = calcCapitalNecessario(meta, ym)
  const prazo = calcPrazoMeses(inicial, mensal, ym, meta)
  const hasData = yieldAnual > 0 && meta > 0

  const handleSave = () => {
    if (!nome.trim()) return
    const sim = salvarSimulacao(nome.trim(), descricao.trim())
    setSaved(sim.id)
    setNome('')
    setDescricao('')
  }

  const handleExport = async () => {
    if (!saved) return
    setExporting(true)
    const projectId = exportarParaMapaMental(saved)
    setExporting(false)
    onExportMindMap?.(projectId)
    onClose()
  }

  const handleClose = () => {
    setSaved(null)
    setNome('')
    setDescricao('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Salvar simulação" maxWidth="max-w-lg">
      {!saved ? (
        <div className="flex flex-col gap-5">
          {/* Preview */}
          {hasData && (
            <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-4">
              <p className="text-xs font-medium text-[#8b949e] mb-3 uppercase tracking-wider">Resumo dos parâmetros</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['Aporte inicial', fmtBRL(inicial)],
                  ['Aporte mensal', fmtBRL(mensal)],
                  [`Yield anual`, `${yieldAnual}%`],
                  ['Meta mensal', fmtBRL(meta)],
                  ['Capital necessário', isFinite(capital) ? fmtK(capital) : '∞'],
                  ['Prazo estimado', formatPrazo(prazo)],
                ].map(([label, val]) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-xs text-[#484f58]">{label}</span>
                    <span className="font-semibold text-[#e6edf3]">{val}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[#21262d]">
                <p className="text-xs text-[#484f58] mb-1.5">Alocação</p>
                <div className="flex gap-3 flex-wrap">
                  {simAlocacao.map(a => (
                    <span key={a.id} className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${a.cor}22`, color: a.cor }}>
                      {a.nome} {a.percentual}%
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!hasData && (
            <div className="bg-[#1a1205] border border-[#f59e0b33] rounded-xl p-4 text-sm text-[#f59e0b]">
              ⚠️ Configure yield e meta antes de salvar para cálculos completos.
            </div>
          )}

          <Input
            label="Nome da simulação"
            placeholder='Ex: "Cenário conservador 2025"'
            value={nome}
            onChange={e => setNome(e.target.value)}
            autoFocus
          />
          <Textarea
            label="Descrição (opcional)"
            placeholder="Notas sobre este cenário..."
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            rows={2}
          />

          {simulacoesSalvas.length >= 10 && (
            <p className="text-xs text-[#f97316]">⚠️ Limite de 10 simulações atingido. A mais antiga será removida.</p>
          )}

          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose} className="flex-1">Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!nome.trim()}
              className="flex-1"
              style={{ background: '#1d9e75', borderColor: '#1d9e75' }}
            >
              <Save size={15} /> Salvar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 py-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#1d9e7522', border: '1px solid #1d9e7544' }}>
            <Save size={24} style={{ color: '#1d9e75' }} />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-[#e6edf3]">Simulação salva!</p>
            <p className="text-sm text-[#8b949e] mt-1">Deseja exportar como Mapa Mental?</p>
          </div>

          <div className="w-full bg-[#0d1117] rounded-xl border border-[#30363d] p-4 text-sm text-center text-[#8b949e]">
            <GitBranch size={20} className="mx-auto mb-2" style={{ color: '#1d9e75' }} />
            <p className="text-[#e6edf3] font-medium mb-1">Exportar como Mapa Mental</p>
            <p className="text-xs">Gera automaticamente os nós com sua meta, aportes, projeção, alocação e próximos passos. Abre direto no editor.</p>
          </div>

          <div className="flex gap-2 w-full">
            <Button variant="ghost" onClick={handleClose} className="flex-1">Fechar</Button>
            <Button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 text-white"
              style={{ background: '#1d9e75' }}
            >
              <GitBranch size={15} />
              {exporting ? 'Exportando...' : 'Exportar Mapa Mental'}
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
