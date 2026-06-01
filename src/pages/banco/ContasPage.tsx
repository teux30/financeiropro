import { useState } from 'react'
import {
  Plus, Eye, EyeOff, CreditCard, Wallet, PiggyBank, Smartphone,
  Banknote, LineChart, MoreHorizontal, Pencil, Trash2,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { ContaBancaria, ContaTipo } from '../../store/bancoTypes'
import { BANCOS, CONTA_TIPOS } from '../../store/bancoTypes'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { fmtBRL, maskSaldo, mesAtual } from '../../lib/format'

const TIPO_ICON: Record<ContaTipo, React.ElementType> = {
  corrente: Wallet, poupanca: PiggyBank, digital: Smartphone,
  dinheiro: Banknote, cartao_credito: CreditCard, investimentos: LineChart, outro: MoreHorizontal,
}

const CORES = ['#820ad1', '#ec7000', '#cc092f', '#0070af', '#ec0000', '#ff7a00', '#21c25e', '#1d9e75', '#e8a020', '#3b82f6', '#64748b', '#242424']

interface FormState {
  nome: string; tipo: ContaTipo; banco: string; saldoInicial: string
  cor: string; contaPadrao: boolean; observacoes: string; saldoMinimo: string
}
const emptyForm = (): FormState => ({
  nome: '', tipo: 'corrente', banco: 'Nubank', saldoInicial: '',
  cor: '#820ad1', contaPadrao: false, observacoes: '', saldoMinimo: '',
})

export function ContasPage() {
  const {
    perfilAtivo, getBanco, getSaldoConta, getSaldoTotal,
    adicionarConta, editarConta, excluirConta,
    ocultarSaldos, setOcultarSaldos, setActiveContaId, setActiveView,
  } = useStore()

  const banco = getBanco()
  const accent = perfilAtivo === 'pessoal' ? '#1d9e75' : '#e8a020'
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const saldoTotal = getSaldoTotal()
  const mes = mesAtual()

  const variacaoMes = (contaId: string) => {
    return banco.transacoes
      .filter(t => t.contaId === contaId && t.data.slice(0, 7) === mes)
      .reduce((s, t) => s + (t.tipo === 'entrada' ? t.valor : -t.valor), 0)
  }

  const openNew = () => { setForm(emptyForm()); setEditId(null); setShowModal(true) }
  const openEdit = (c: ContaBancaria) => {
    setForm({
      nome: c.nome, tipo: c.tipo, banco: c.banco, saldoInicial: String(c.saldoInicial),
      cor: c.cor, contaPadrao: c.contaPadrao, observacoes: c.observacoes ?? '',
      saldoMinimo: c.saldoMinimo != null ? String(c.saldoMinimo) : '',
    })
    setEditId(c.id); setShowModal(true)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    const payload = {
      nome: form.nome.trim(), tipo: form.tipo, banco: form.banco as ContaBancaria['banco'],
      saldoInicial: parseFloat(form.saldoInicial) || 0, cor: form.cor,
      contaPadrao: form.contaPadrao, observacoes: form.observacoes.trim() || undefined,
      saldoMinimo: form.saldoMinimo ? parseFloat(form.saldoMinimo) : undefined,
    }
    if (editId) editarConta(editId, payload)
    else adicionarConta(payload)
    setShowModal(false)
  }

  const abrirDetalhe = (id: string) => { setActiveContaId(id); setActiveView('conta_detalhe') }

  const handleDelete = (c: ContaBancaria) => {
    const saldo = getSaldoConta(c.id)
    if (Math.abs(saldo) > 0.01) { setConfirmDel(c.id); return }
    excluirConta(c.id)
    setConfirmDel(null)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#e6edf3]">Minhas Contas</h1>
            <p className="text-xs sm:text-sm text-[#8b949e] mt-0.5">{banco.contas.length} contas cadastradas</p>
          </div>
          <Button onClick={openNew} className="text-white" style={{ background: accent } as React.CSSProperties}>
            <Plus size={16} /> <span className="hidden sm:inline">Nova conta</span>
          </Button>
        </div>

        {/* Saldo total */}
        <div className="rounded-2xl p-5 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#8b949e] uppercase tracking-wider">Saldo total</span>
            <button onClick={() => setOcultarSaldos(!ocultarSaldos)} className="text-[#8b949e] hover:text-[#e6edf3] transition-colors">
              {ocultarSaldos ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-3xl sm:text-4xl font-black" style={{ color: accent }}>
            {maskSaldo(fmtBRL(saldoTotal), ocultarSaldos)}
          </p>
          {/* Distribuição por conta */}
          {banco.contas.length > 0 && (
            <div className="flex gap-1 mt-4 h-2 rounded-full overflow-hidden">
              {banco.contas.map(c => {
                const saldo = Math.max(0, getSaldoConta(c.id))
                const pct = saldoTotal > 0 ? (saldo / saldoTotal) * 100 : 0
                return <div key={c.id} style={{ width: `${pct}%`, background: c.cor }} title={c.nome} />
              })}
            </div>
          )}
        </div>

        {/* Cards de contas */}
        {banco.contas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#141a14' }}>
              <Wallet size={28} className="text-[#30363d]" />
            </div>
            <p className="text-[#8b949e] mb-4">Nenhuma conta cadastrada ainda</p>
            <Button onClick={openNew} className="text-white" style={{ background: accent } as React.CSSProperties}>
              <Plus size={16} /> Cadastrar primeira conta
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {banco.contas.map(c => {
              const Icon = TIPO_ICON[c.tipo]
              const saldo = getSaldoConta(c.id)
              const variacao = variacaoMes(c.id)
              const ultimas = banco.transacoes.filter(t => t.contaId === c.id)
                .sort((a, b) => b.data.localeCompare(a.data)).slice(0, 2)
              return (
                <div key={c.id}
                  onClick={() => abrirDetalhe(c.id)}
                  className="group relative rounded-2xl p-4 cursor-pointer transition-transform hover:scale-[1.02] overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${c.cor}, ${c.cor}bb)`, minHeight: 170 }}
                >
                  {/* glow circle */}
                  <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-20" style={{ background: '#fff' }} />
                  <div className="relative flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon size={20} className="text-white" />
                      <div>
                        <p className="text-sm font-semibold text-white leading-tight">{c.nome}</p>
                        <p className="text-xs text-white/70">{c.banco}</p>
                      </div>
                    </div>
                    {c.contaPadrao && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/25 text-white font-medium">Padrão</span>
                    )}
                  </div>
                  <span className="relative inline-block text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white mb-2">
                    {CONTA_TIPOS.find(t => t.tipo === c.tipo)?.label}
                  </span>
                  <p className="relative text-2xl font-black text-white">{maskSaldo(fmtBRL(saldo), ocultarSaldos)}</p>
                  <p className="relative text-xs mt-1" style={{ color: variacao >= 0 ? '#d1fae5' : '#fecaca' }}>
                    {variacao >= 0 ? '↑' : '↓'} {maskSaldo(fmtBRL(Math.abs(variacao)), ocultarSaldos)} no mês
                  </p>

                  {/* hover actions */}
                  <div className="absolute right-3 bottom-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white"><Pencil size={12} /></button>
                    <button onClick={() => handleDelete(c)} className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/60 text-white"><Trash2 size={12} /></button>
                  </div>

                  {/* preview transações */}
                  {ultimas.length > 0 && (
                    <div className="relative mt-3 pt-2 border-t border-white/20 flex flex-col gap-0.5">
                      {ultimas.map(t => (
                        <div key={t.id} className="flex items-center justify-between text-[11px] text-white/85">
                          <span className="truncate max-w-[60%]">{t.descricao}</span>
                          <span>{t.tipo === 'entrada' ? '+' : '-'}{maskSaldo(fmtBRL(t.valor), ocultarSaldos)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal nova/editar conta */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Editar conta' : 'Nova conta'}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input label="Nome da conta" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Conta principal" autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#8b949e]">Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as ContaTipo }))}
                className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#1d9e75]">
                {CONTA_TIPOS.map(t => <option key={t.tipo} value={t.tipo}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#8b949e]">Banco</label>
              <select value={form.banco} onChange={e => {
                const b = BANCOS.find(x => x.nome === e.target.value)
                setForm(f => ({ ...f, banco: e.target.value, cor: b?.cor ?? f.cor }))
              }}
                className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#1d9e75]">
                {BANCOS.map(b => <option key={b.nome} value={b.nome}>{b.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Saldo inicial (R$)" type="number" inputMode="decimal" value={form.saldoInicial}
              onChange={e => setForm(f => ({ ...f, saldoInicial: e.target.value }))} placeholder="0,00" />
            <Input label="Saldo mínimo (alerta)" type="number" inputMode="decimal" value={form.saldoMinimo}
              onChange={e => setForm(f => ({ ...f, saldoMinimo: e.target.value }))} placeholder="opcional" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#8b949e]">Cor de identificação</label>
            <div className="flex gap-2 flex-wrap">
              {CORES.map(cor => (
                <button key={cor} type="button" onClick={() => setForm(f => ({ ...f, cor }))}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                  style={{ background: cor, outline: form.cor === cor ? '2px solid #fff' : 'none', outlineOffset: 2 }} />
              ))}
            </div>
          </div>
          <Input label="Observações" value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="opcional" />
          <label className="flex items-center gap-2 text-sm text-[#e6edf3] cursor-pointer">
            <input type="checkbox" checked={form.contaPadrao} onChange={e => setForm(f => ({ ...f, contaPadrao: e.target.checked }))}
              className="accent-[#1d9e75] w-4 h-4" />
            Definir como conta padrão
          </label>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1 text-white" style={{ background: accent } as React.CSSProperties}>Salvar</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm delete (saldo não zerado) */}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Não é possível excluir">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#8b949e]">Esta conta possui saldo diferente de zero. Zere o saldo (via transferência ou transações) antes de excluí-la.</p>
          <Button onClick={() => setConfirmDel(null)} className="text-white" style={{ background: accent } as React.CSSProperties}>Entendi</Button>
        </div>
      </Modal>
    </div>
  )
}
