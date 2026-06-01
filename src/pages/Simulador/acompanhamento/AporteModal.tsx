import { useState } from 'react'
import { PiggyBank, Sparkles } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Button } from '../../../components/ui/Button'
import { useStore } from '../../../store/useStore'
import type { Objetivo } from '../../../store/objetivoTypes'
import { fmtBRL } from '../../../lib/format'
import { patrimonioAlvo } from '../../../store/objetivoTypes'
import { totalComRendimentos } from '../../../store/objetivoSelectors'

interface Props {
  open: boolean
  onClose: () => void
  objetivo: Objetivo
  valorSugerido?: number
}

const hoje = () => new Date().toISOString().slice(0, 10)

export function AporteModal({ open, onClose, objetivo, valorSugerido }: Props) {
  const { registraraporteUI, aportesReais, getBanco, registrarTransacao } = useStoreAporte()
  const banco = getBanco('pessoal')

  const [valor, setValor] = useState(valorSugerido ? String(valorSugerido) : '')
  const [data, setData] = useState(hoje())
  const [contaOrigemId, setContaOrigemId] = useState('')
  const [obs, setObs] = useState('')
  const [vincularBanco, setVincularBanco] = useState(false)

  const alvo = patrimonioAlvo(objetivo)
  const guardadoApos = totalComRendimentos(objetivo, aportesReais) + (parseFloat(valor) || 0)
  const falta = Math.max(0, alvo - guardadoApos)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = parseFloat(valor) || 0
    if (v <= 0) return
    registraraporteUI({
      objetivoId: objetivo.id, valor: v, data,
      contaOrigemId: vincularBanco && contaOrigemId ? contaOrigemId : undefined,
      observacao: obs.trim() || undefined,
    })
    // integração bancária: saída na conta de origem (vai pra investimentos)
    if (vincularBanco && contaOrigemId) {
      registrarTransacao({
        contaId: contaOrigemId, tipo: 'saida', valor: v,
        descricao: `Aporte: ${objetivo.nome}`, categoria: 'outros_saida',
        data, recorrente: false, origemAuto: 'manual',
      }, 'pessoal')
    }
    setValor(''); setObs('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Guardar dinheiro" maxWidth="max-w-md">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#1d9e7510', border: '1px solid #1d9e7533' }}>
          <PiggyBank size={20} style={{ color: '#1d9e75' }} />
          <div>
            <p className="text-xs text-[#8b949e]">Objetivo</p>
            <p className="text-sm font-semibold text-[#e6edf3]">{objetivo.nome}</p>
          </div>
        </div>

        <Input label="Valor guardado (R$)" type="number" inputMode="decimal" value={valor}
          onChange={e => setValor(e.target.value)} placeholder="0,00" autoFocus />

        {/* feedback motivacional */}
        {parseFloat(valor) > 0 && (
          <div className="flex items-center gap-2 text-xs" style={{ color: '#1d9e75' }}>
            <Sparkles size={13} />
            {falta > 0 ? `Faltam ${fmtBRL(falta)} para a meta!` : 'Você atingiu a meta! 🎉'}
          </div>
        )}

        <Input label="Data" type="date" value={data} onChange={e => setData(e.target.value)} />

        {/* vínculo com banco */}
        {banco.contas.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-[#e6edf3] cursor-pointer">
              <input type="checkbox" checked={vincularBanco} onChange={e => setVincularBanco(e.target.checked)}
                className="accent-[#1d9e75] w-4 h-4" />
              Debitar de uma conta bancária
            </label>
            {vincularBanco && (
              <select value={contaOrigemId} onChange={e => setContaOrigemId(e.target.value)}
                className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#1d9e75]">
                <option value="">Selecione a conta...</option>
                {banco.contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            )}
          </div>
        )}

        <Input label="Observação (opcional)" value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: 13º salário" />

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" className="flex-1 text-white" style={{ background: '#1d9e75' } as React.CSSProperties}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// helper para extrair só o que precisamos (evita re-render do componente inteiro do store grande)
function useStoreAporte() {
  const registrarAporte = useStore(s => s.registrarAporte)
  const aportesReais = useStore(s => s.aportesReais)
  const getBanco = useStore(s => s.getBanco)
  const registrarTransacao = useStore(s => s.registrarTransacao)
  return { registraraporteUI: registrarAporte, aportesReais, getBanco, registrarTransacao }
}
