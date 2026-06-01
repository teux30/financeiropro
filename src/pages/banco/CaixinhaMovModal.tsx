import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useStore } from '../../store/useStore'
import type { Caixinha } from '../../store/bancoTypes'
import { fmtBRL, hoje } from '../../lib/format'

type Acao = 'deposito' | 'retirada' | 'transferencia'

interface Props {
  open: boolean
  onClose: () => void
  acao: Acao
  caixinha: Caixinha
  accent: string
}

export function CaixinhaMovModal({ open, onClose, acao, caixinha, accent }: Props) {
  const {
    getBanco, getSaldoCaixinha, getSaldoLivreConta,
    depositarCaixinha, retirarCaixinha, transferirEntreCaixinhas,
  } = useStore()

  const [valor, setValor] = useState('')
  const [data, setData] = useState(hoje())
  const [obs, setObs] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [erro, setErro] = useState('')

  const banco = getBanco()
  const saldoCaixinha = getSaldoCaixinha(caixinha.id)
  const saldoLivre = getSaldoLivreConta(caixinha.contaId)
  const outrasCaixinhas = banco.caixinhas.filter(c => c.contaId === caixinha.contaId && c.id !== caixinha.id)

  const titulo = acao === 'deposito' ? 'Guardar dinheiro' : acao === 'retirada' ? 'Resgatar' : 'Transferir para outra caixinha'
  const Icon = acao === 'deposito' ? ArrowDownToLine : acao === 'retirada' ? ArrowUpFromLine : ArrowLeftRight
  const maxLabel = acao === 'deposito' ? `Disponível na conta: ${fmtBRL(saldoLivre)}` : `Saldo da caixinha: ${fmtBRL(saldoCaixinha)}`

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    const v = parseFloat(valor) || 0
    if (v <= 0) { setErro('Informe um valor válido.'); return }
    let ok = false
    if (acao === 'deposito') {
      if (v > saldoLivre + 0.001) { setErro('Valor maior que o saldo livre da conta.'); return }
      ok = depositarCaixinha(caixinha.id, v, data, obs || undefined)
    } else if (acao === 'retirada') {
      if (v > saldoCaixinha + 0.001) { setErro('Valor maior que o saldo da caixinha.'); return }
      ok = retirarCaixinha(caixinha.id, v, data, obs || undefined)
    } else {
      if (!destinoId) { setErro('Escolha a caixinha de destino.'); return }
      if (v > saldoCaixinha + 0.001) { setErro('Valor maior que o saldo da caixinha.'); return }
      ok = transferirEntreCaixinhas(caixinha.id, destinoId, v, data, obs || undefined)
    }
    if (!ok) { setErro('Não foi possível concluir.'); return }
    setValor(''); setObs(''); setDestinoId('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={titulo}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${caixinha.cor}15`, border: `1px solid ${caixinha.cor}33` }}>
          <Icon size={20} style={{ color: caixinha.cor }} />
          <div>
            <p className="text-xs text-[#8b949e]">Caixinha</p>
            <p className="text-sm font-semibold text-[#e6edf3]">{caixinha.nome}</p>
          </div>
        </div>

        <Input label="Valor (R$)" type="number" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" autoFocus />
        <p className="-mt-2 text-xs text-[#8b949e]">{maxLabel}</p>

        {acao === 'transferencia' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#8b949e]">Caixinha de destino</label>
            <select value={destinoId} onChange={e => setDestinoId(e.target.value)}
              className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#1d9e75]">
              <option value="">Selecione...</option>
              {outrasCaixinhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {outrasCaixinhas.length === 0 && <span className="text-xs text-[#e8a020]">Não há outra caixinha nesta conta.</span>}
          </div>
        )}

        <Input label="Data" type="date" value={data} onChange={e => setData(e.target.value)} />
        <Input label="Observação (opcional)" value={obs} onChange={e => setObs(e.target.value)} />

        {erro && <p className="text-xs text-[#ef4444]">{erro}</p>}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" className="flex-1 text-white" style={{ background: accent } as React.CSSProperties}>
            {acao === 'deposito' ? 'Guardar' : acao === 'retirada' ? 'Resgatar' : 'Transferir'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
