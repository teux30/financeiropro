import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { CaixinhaIcon } from '../../lib/caixinha-icons'
import { CAIXINHA_ICONES, CAIXINHA_CORES } from '../../store/bancoTypes'
import type { Caixinha } from '../../store/bancoTypes'

interface Props {
  open: boolean
  onClose: () => void
  contaId: string
  accent: string
  initial?: Caixinha
  onSave: (data: Omit<Caixinha, 'id' | 'criadoEm'>, depositoInicial?: number) => void
}

export function CaixinhaForm({ open, onClose, contaId, accent, initial, onSave }: Props) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [icone, setIcone] = useState(initial?.icone ?? 'PiggyBank')
  const [cor, setCor] = useState(initial?.cor ?? CAIXINHA_CORES[0])
  const [meta, setMeta] = useState(initial?.meta ? String(initial.meta) : '')
  const [dataAlvo, setDataAlvo] = useState(initial?.dataAlvo ?? '')
  const [rende, setRende] = useState(initial?.rende ?? false)
  const [rendimentoAnual, setRendimentoAnual] = useState(initial?.rendimentoAnual ? String(initial.rendimentoAnual) : '10')
  const [depositoInicial, setDepositoInicial] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    onSave({
      contaId, nome: nome.trim(), icone, cor,
      meta: meta ? parseFloat(meta) : undefined,
      dataAlvo: dataAlvo || undefined,
      rende,
      rendimentoAnual: rende ? (parseFloat(rendimentoAnual) || 0) : undefined,
      objetivoId: initial?.objetivoId,
    }, !initial && depositoInicial ? parseFloat(depositoInicial) : undefined)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar caixinha' : 'Nova caixinha'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Reserva de emergência" autoFocus />

        {/* ícone */}
        <div>
          <label className="text-sm font-medium text-[#8b949e] block mb-2">Ícone</label>
          <div className="grid grid-cols-8 gap-2">
            {CAIXINHA_ICONES.map(ic => (
              <button key={ic} type="button" onClick={() => setIcone(ic)}
                className="aspect-square rounded-lg flex items-center justify-center transition-colors"
                style={{ background: icone === ic ? `${cor}33` : '#0a0f0a', border: `1px solid ${icone === ic ? cor : '#30363d'}`, color: icone === ic ? cor : '#8b949e' }}>
                <CaixinhaIcon icone={ic} size={16} />
              </button>
            ))}
          </div>
        </div>

        {/* cor */}
        <div>
          <label className="text-sm font-medium text-[#8b949e] block mb-2">Cor</label>
          <div className="flex gap-2 flex-wrap">
            {CAIXINHA_CORES.map(c => (
              <button key={c} type="button" onClick={() => setCor(c)}
                className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                style={{ background: c, outline: cor === c ? '2px solid #fff' : 'none', outlineOffset: 2 }} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Meta (R$) — opcional" type="number" inputMode="decimal" value={meta} onChange={e => setMeta(e.target.value)} placeholder="0,00" />
          <Input label="Data alvo — opcional" type="date" value={dataAlvo} onChange={e => setDataAlvo(e.target.value)} />
        </div>

        {!initial && (
          <Input label="Depósito inicial (R$) — opcional" type="number" inputMode="decimal" value={depositoInicial} onChange={e => setDepositoInicial(e.target.value)} placeholder="0,00" />
        )}

        <label className="flex items-center gap-2 text-sm text-[#e6edf3] cursor-pointer">
          <input type="checkbox" checked={rende} onChange={e => setRende(e.target.checked)} className="accent-[#1d9e75] w-4 h-4" />
          Esta caixinha rende
        </label>
        {rende && (
          <Input label="Rendimento anual (%)" type="number" inputMode="decimal" value={rendimentoAnual} onChange={e => setRendimentoAnual(e.target.value)} />
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" className="flex-1 text-white" style={{ background: accent } as React.CSSProperties}>
            {initial ? 'Salvar' : 'Criar caixinha'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
