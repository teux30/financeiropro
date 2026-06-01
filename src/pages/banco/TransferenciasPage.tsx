import { useState } from 'react'
import { ArrowRight, ArrowLeftRight, RotateCcw, AlertCircle } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { fmtBRL, fmtData, hoje, maskSaldo } from '../../lib/format'

export function TransferenciasPage() {
  const {
    perfilAtivo, getBanco, getSaldoConta, fazerTransferencia, estornarTransferencia, ocultarSaldos,
  } = useStore()
  const banco = getBanco()
  const accent = perfilAtivo === 'pessoal' ? '#1d9e75' : '#e8a020'

  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hoje())
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState('')

  const saldoOrigem = origem ? getSaldoConta(origem) : 0
  const valorNum = parseFloat(valor) || 0
  const podeTransferir = origem && destino && origem !== destino && valorNum > 0 && valorNum <= saldoOrigem

  const contaNome = (id: string) => banco.contas.find(c => c.id === id)?.nome ?? '—'
  const contaCor = (id: string) => banco.contas.find(c => c.id === id)?.cor ?? '#64748b'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (origem === destino) { setErro('Conta de origem e destino devem ser diferentes.'); return }
    if (valorNum > saldoOrigem) { setErro('Saldo insuficiente na conta de origem.'); return }
    const ok = fazerTransferencia({ contaOrigemId: origem, contaDestinoId: destino, valor: valorNum, data, descricao })
    if (!ok) { setErro('Não foi possível concluir a transferência.'); return }
    setValor(''); setDescricao(''); setOrigem(''); setDestino('')
  }

  const historico = [...banco.transferencias].sort((a, b) => b.data.localeCompare(a.data))

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={20} style={{ color: accent }} />
          <h1 className="text-xl sm:text-2xl font-bold text-[#e6edf3]">Transferências</h1>
        </div>

        {banco.contas.length < 2 ? (
          <div className="rounded-xl p-5 border flex items-center gap-3" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <AlertCircle size={18} className="text-[#e8a020]" />
            <p className="text-sm text-[#8b949e]">Cadastre ao menos 2 contas para transferir.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl p-5 border flex flex-col gap-4" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#8b949e]">De (origem)</label>
              <select value={origem} onChange={e => setOrigem(e.target.value)}
                className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-[#e6edf3] focus:outline-none focus:border-[#1d9e75]">
                <option value="">Selecione...</option>
                {banco.contas.map(c => <option key={c.id} value={c.id}>{c.nome} — {fmtBRL(getSaldoConta(c.id))}</option>)}
              </select>
              {origem && <span className="text-xs text-[#8b949e]">Saldo disponível: <strong style={{ color: accent }}>{maskSaldo(fmtBRL(saldoOrigem), ocultarSaldos)}</strong></span>}
            </div>

            <div className="flex justify-center"><div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${accent}22` }}><ArrowRight size={16} style={{ color: accent }} /></div></div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#8b949e]">Para (destino)</label>
              <select value={destino} onChange={e => setDestino(e.target.value)}
                className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-[#e6edf3] focus:outline-none focus:border-[#1d9e75]">
                <option value="">Selecione...</option>
                {banco.contas.filter(c => c.id !== origem).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <Input label="Valor (R$)" type="number" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" />
            <Input label="Data" type="date" value={data} onChange={e => setData(e.target.value)} />
            <Input label="Descrição (opcional)" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Reserva" />

            {/* Preview */}
            {origem && destino && valorNum > 0 && (
              <div className="rounded-xl p-3 flex items-center justify-between text-xs" style={{ background: '#0a0f0a', border: '1px solid #30363d' }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: contaCor(origem) }} />
                  <span className="text-[#e6edf3]">{contaNome(origem)}</span>
                  <span className="text-[#ef4444]">-{fmtBRL(valorNum)}</span>
                </div>
                <ArrowRight size={13} className="text-[#8b949e]" />
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: contaCor(destino) }} />
                  <span className="text-[#e6edf3]">{contaNome(destino)}</span>
                  <span className="text-[#10b981]">+{fmtBRL(valorNum)}</span>
                </div>
              </div>
            )}

            {erro && <p className="text-xs text-[#ef4444] flex items-center gap-1"><AlertCircle size={13} /> {erro}</p>}

            <Button type="submit" disabled={!podeTransferir} className="text-white" style={{ background: accent } as React.CSSProperties}>
              Confirmar transferência
            </Button>
          </form>
        )}

        {/* Histórico */}
        {historico.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">Histórico</p>
            <div className="flex flex-col gap-1.5">
              {historico.map(t => (
                <div key={t.id} className="group flex items-center gap-3 rounded-xl p-3 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}22` }}>
                    <ArrowLeftRight size={15} style={{ color: accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#e6edf3] truncate">
                      {contaNome(t.contaOrigemId)} → {contaNome(t.contaDestinoId)}
                    </p>
                    <p className="text-[11px] text-[#484f58]">{fmtData(t.data)}{t.descricao ? ` · ${t.descricao}` : ''}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#e6edf3]">{maskSaldo(fmtBRL(t.valor), ocultarSaldos)}</span>
                  <button onClick={() => estornarTransferencia(t.id)} title="Estornar"
                    className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#ef4444] opacity-0 group-hover:opacity-100 transition-opacity">
                    <RotateCcw size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
