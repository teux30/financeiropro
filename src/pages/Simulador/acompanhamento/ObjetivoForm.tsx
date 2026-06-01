import { useState } from 'react'
import { Target, TrendingUp } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import type { Objetivo, ObjetivoTipo, Frequencia } from '../../../store/objetivoTypes'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: Omit<Objetivo, 'id' | 'criadoEm'>) => void
  initial?: Objetivo
}

const hoje = () => new Date().toISOString().slice(0, 10)

export function ObjetivoForm({ open, onClose, onSave, initial }: Props) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [tipo, setTipo] = useState<ObjetivoTipo>(initial?.tipo ?? 'patrimonio')
  const [valorAlvo, setValorAlvo] = useState(String(initial?.valorAlvo ?? ''))
  const [dataInicio, setDataInicio] = useState(initial?.dataInicio ?? hoje())
  const [dataAlvo, setDataAlvo] = useState(initial?.dataAlvo ?? '')
  const [frequencia, setFrequencia] = useState<Frequencia>(initial?.frequencia ?? 'mensal')
  const [valorPlanejado, setValorPlanejado] = useState(String(initial?.valorPlanejado ?? ''))
  const [yieldAnual, setYieldAnual] = useState(String(initial?.yieldAnual ?? 10))
  const [principal, setPrincipal] = useState(initial?.principal ?? true)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !valorAlvo) return
    onSave({
      nome: nome.trim(),
      tipo,
      valorAlvo: parseFloat(valorAlvo) || 0,
      dataInicio,
      dataAlvo: dataAlvo || undefined,
      frequencia,
      valorPlanejado: parseFloat(valorPlanejado) || 0,
      yieldAnual: parseFloat(yieldAnual) || 0,
      principal,
    })
    onClose()
  }

  const periodoLabel = frequencia === 'diario' ? 'dia' : frequencia === 'semanal' ? 'semana' : 'mês'

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar objetivo' : 'Novo objetivo'} maxWidth="max-w-lg">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Nome do objetivo" value={nome} onChange={e => setNome(e.target.value)}
          placeholder="Ex: Juntar R$ 120.000" autoFocus />

        {/* tipo */}
        <div>
          <label className="text-sm font-medium text-[#8b949e] block mb-1.5">Tipo de meta</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setTipo('patrimonio')}
              className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm transition-colors border"
              style={{ background: tipo === 'patrimonio' ? '#1d9e7522' : 'transparent', color: tipo === 'patrimonio' ? '#1d9e75' : '#8b949e', borderColor: tipo === 'patrimonio' ? '#1d9e75' : '#30363d' }}>
              <Target size={15} /> Patrimônio
            </button>
            <button type="button" onClick={() => setTipo('renda')}
              className="flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm transition-colors border"
              style={{ background: tipo === 'renda' ? '#1d9e7522' : 'transparent', color: tipo === 'renda' ? '#1d9e75' : '#8b949e', borderColor: tipo === 'renda' ? '#1d9e75' : '#30363d' }}>
              <TrendingUp size={15} /> Renda mensal
            </button>
          </div>
        </div>

        <Input label={tipo === 'renda' ? 'Renda mensal alvo (R$/mês)' : 'Valor alvo (R$)'}
          type="number" inputMode="decimal" value={valorAlvo} onChange={e => setValorAlvo(e.target.value)}
          placeholder={tipo === 'renda' ? '1000' : '120000'} />
        {tipo === 'renda' && (
          <p className="-mt-2 text-xs text-[#8b949e]">Convertido em patrimônio necessário pelo yield informado.</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Data de início" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          <Input label="Data alvo (opcional)" type="date" value={dataAlvo} onChange={e => setDataAlvo(e.target.value)} />
        </div>

        {/* frequência */}
        <div>
          <label className="text-sm font-medium text-[#8b949e] block mb-1.5">Frequência de aporte</label>
          <div className="grid grid-cols-3 gap-2">
            {(['diario', 'semanal', 'mensal'] as Frequencia[]).map(f => (
              <button key={f} type="button" onClick={() => setFrequencia(f)}
                className="py-2 rounded-lg text-sm capitalize transition-colors border"
                style={{ background: frequencia === f ? '#1d9e7522' : 'transparent', color: frequencia === f ? '#1d9e75' : '#8b949e', borderColor: frequencia === f ? '#1d9e75' : '#30363d' }}>
                {f === 'diario' ? 'Diário' : f === 'semanal' ? 'Semanal' : 'Mensal'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label={`Valor por ${periodoLabel} (R$)`} type="number" inputMode="decimal"
            value={valorPlanejado} onChange={e => setValorPlanejado(e.target.value)} placeholder="100" />
          <Input label="Yield anual (%)" type="number" inputMode="decimal"
            value={yieldAnual} onChange={e => setYieldAnual(e.target.value)} placeholder="10" />
        </div>

        <label className="flex items-center gap-2 text-sm text-[#e6edf3] cursor-pointer">
          <input type="checkbox" checked={principal} onChange={e => setPrincipal(e.target.checked)}
            className="accent-[#1d9e75] w-4 h-4" />
          Marcar como objetivo principal
        </label>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" className="flex-1 text-white" style={{ background: '#1d9e75' } as React.CSSProperties}>
            {initial ? 'Salvar' : 'Criar objetivo'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
