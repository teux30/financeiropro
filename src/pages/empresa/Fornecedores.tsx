import { useState, useMemo } from 'react'
import {
  Truck, Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight,
  BarChart3, ArrowLeft, Phone, FileText,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useStore } from '../../store/useStore'
import type { Fornecedor } from '../../store/empresaTypes'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { fmtBRL, fmtData, maskSaldo } from '../../lib/format'

const CATEGORIAS_FORN = ['Carnes', 'Bebidas', 'Hortifruti', 'Embalagens', 'Gás', 'Limpeza', 'Serviços', 'Mercearia', 'Outros']
const MES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function FornecedoresPage() {
  const {
    getEmpresaAtiva, getFornecedores, adicionarFornecedor, atualizarFornecedor, excluirFornecedor,
    getGastosPorFornecedor, getHistoricoFornecedor, ocultarSaldos,
  } = useStore()
  const emp = getEmpresaAtiva()
  const fornecedores = getFornecedores()

  const now = new Date()
  const [ano, setAno] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<Fornecedor | null>(null)
  const [ficha, setFicha] = useState<Fornecedor | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const pad = (n: number) => String(n).padStart(2, '0')
  const de = `${ano}-${pad(mes)}-01`
  const ate = `${ano}-${pad(mes)}-${pad(new Date(ano, mes, 0).getDate())}`
  const gastos = useMemo(() => getGastosPorFornecedor(de, ate), [de, ate, getGastosPorFornecedor])
  const totalMes = gastos.reduce((s, g) => s + g.total, 0)

  const mudarMes = (delta: number) => {
    let m = mes + delta, a = ano
    if (m < 1) { m = 12; a-- } else if (m > 12) { m = 1; a++ }
    setMes(m); setAno(a)
  }

  if (!emp) return <div className="flex-1 flex items-center justify-center text-[#8b949e]">Nenhuma empresa ativa.</div>

  // ── Ficha do fornecedor ──────────────────────────────────────────────────
  if (ficha) {
    const hist = getHistoricoFornecedor(ficha.id)
    const totalGeral = hist.reduce((s, t) => s + t.valor, 0)
    const noMes = hist.filter(t => t.data.slice(0, 7) === `${ano}-${pad(mes)}`).reduce((s, t) => s + t.valor, 0)
    return (
      <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-4">
          <button onClick={() => setFicha(null)} className="flex items-center gap-1.5 text-[#8b949e] hover:text-[#e6edf3] text-sm self-start"><ArrowLeft size={16} /> Fornecedores</button>
          <div className="rounded-2xl p-5 border" style={{ background: '#141a14', borderColor: '#e8a02033' }}>
            <h1 className="text-xl font-bold text-[#e6edf3]">{ficha.nome}</h1>
            <p className="text-xs text-[#8b949e] mt-0.5">{ficha.categoria || 'Sem categoria'}{ficha.status === 'inativo' ? ' · inativo' : ''}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-[#8b949e]">
              {ficha.contato && <span className="flex items-center gap-1"><Phone size={12} /> {ficha.contato}</span>}
              {ficha.cnpj && <span className="flex items-center gap-1"><FileText size={12} /> {ficha.cnpj}</span>}
              {ficha.pix && <span>PIX: {ficha.pix}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div><p className="text-[11px] text-[#8b949e]">Pago no mês</p><p className="text-lg font-bold" style={{ color: '#e8a020' }}>{maskSaldo(fmtBRL(noMes), ocultarSaldos)}</p></div>
              <div><p className="text-[11px] text-[#8b949e]">Total histórico</p><p className="text-lg font-bold text-[#e6edf3]">{maskSaldo(fmtBRL(totalGeral), ocultarSaldos)}</p></div>
            </div>
          </div>
          <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Histórico de pagamentos</p>
          {hist.length === 0 ? <p className="text-sm text-[#8b949e]">Nenhum pagamento vinculado a este fornecedor ainda.</p> : (
            <div className="rounded-xl border overflow-hidden" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
              {hist.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#21262d] last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#e6edf3] truncate">{t.descricao}</p>
                    <p className="text-[11px] text-[#484f58]">{fmtData(t.data)}</p>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#ef4444' }}>{maskSaldo(fmtBRL(t.valor), ocultarSaldos)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const lista = fornecedores.filter(f => !busca || f.nome.toLowerCase().includes(busca.toLowerCase()) || (f.categoria ?? '').toLowerCase().includes(busca.toLowerCase()))
  const totalById = (id: string) => gastos.find(g => g.fornecedorId === id)?.total ?? 0

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#e8a02022' }}><Truck size={18} style={{ color: '#e8a020' }} /></div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#e6edf3]">Fornecedores</h1>
            <p className="text-xs text-[#8b949e]">Cadastro e controle de gastos por fornecedor</p>
          </div>
          <Button onClick={() => { setEdit(null); setModal(true) }} className="text-white" style={{ background: '#e8a020' } as React.CSSProperties}><Plus size={15} /> Novo</Button>
        </div>

        {/* Relatório: gastos por fornecedor no mês */}
        <div className="rounded-2xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><BarChart3 size={16} style={{ color: '#e8a020' }} /><span className="text-sm font-semibold text-[#e6edf3]">Gastos por fornecedor</span></div>
            <div className="flex items-center gap-2">
              <button onClick={() => mudarMes(-1)} className="p-1 text-[#8b949e] hover:text-[#e6edf3]"><ChevronLeft size={16} /></button>
              <span className="text-sm text-[#e6edf3]">{MES_NOMES[mes - 1]}/{ano}</span>
              <button onClick={() => mudarMes(1)} className="p-1 text-[#8b949e] hover:text-[#e6edf3]"><ChevronRight size={16} /></button>
            </div>
          </div>
          {gastos.length === 0 ? <p className="text-sm text-[#8b949e] text-center py-6">Nenhum gasto vinculado a fornecedor neste mês.</p> : (
            <>
              <p className="text-xs text-[#8b949e] mb-2">Total no mês: <strong style={{ color: '#e8a020' }}>{maskSaldo(fmtBRL(totalMes), ocultarSaldos)}</strong></p>
              <ResponsiveContainer width="100%" height={Math.min(240, 40 + gastos.length * 32)}>
                <BarChart data={gastos.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 10 }} tickFormatter={v => fmtBRL(v)} />
                  <YAxis type="category" dataKey="nome" tick={{ fill: '#8b949e', fontSize: 11 }} width={90} />
                  <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 6 }} formatter={(v) => [fmtBRL(Number(v)), 'Gasto']} />
                  <Bar dataKey="total" fill="#e8a020" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Busca */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar fornecedor..."
            className="w-full bg-[#141a14] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#e8a020]" />
        </div>

        {/* Lista */}
        {lista.length === 0 ? <p className="text-sm text-[#8b949e] text-center py-8">Nenhum fornecedor cadastrado.</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lista.map(f => (
              <div key={f.id} className="rounded-xl border p-4 group cursor-pointer" style={{ background: '#141a14', borderColor: f.status === 'ativo' ? '#e8a02033' : 'rgba(255,255,255,0.06)' }} onClick={() => setFicha(f)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#e6edf3] truncate">{f.nome}</p>
                    <p className="text-[11px] text-[#8b949e]">{f.categoria || 'Sem categoria'}{f.status === 'inativo' ? ' · inativo' : ''}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEdit(f); setModal(true) }} className="p-1 text-[#8b949e] hover:text-[#e6edf3]"><Pencil size={13} /></button>
                    <button onClick={() => setConfirmDel(f.id)} className="p-1 text-[#8b949e] hover:text-[#ef4444]"><Trash2 size={13} /></button>
                  </div>
                </div>
                <p className="text-xs mt-2 text-[#8b949e]">Pago no mês: <strong style={{ color: '#e8a020' }}>{maskSaldo(fmtBRL(totalById(f.id)), ocultarSaldos)}</strong></p>
                {confirmDel === f.id && (
                  <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setConfirmDel(null)} className="flex-1 py-1.5 text-xs rounded-lg bg-[#21262d] text-[#8b949e]">Cancelar</button>
                    <button onClick={() => { excluirFornecedor(f.id); setConfirmDel(null) }} className="flex-1 py-1.5 text-xs rounded-lg bg-[#da3633] text-white">Excluir</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <FornecedorForm open={modal} onClose={() => setModal(false)} initial={edit}
        onSave={(d) => { if (edit) atualizarFornecedor(edit.id, d); else adicionarFornecedor(d) }} />
    </div>
  )
}

function FornecedorForm({ open, onClose, initial, onSave }: {
  open: boolean; onClose: () => void; initial: Fornecedor | null
  onSave: (d: Omit<Fornecedor, 'id' | 'criadoEm'>) => void
}) {
  const [f, setF] = useState(() => ({
    nome: initial?.nome ?? '', categoria: initial?.categoria ?? '', contato: initial?.contato ?? '',
    email: initial?.email ?? '', cnpj: initial?.cnpj ?? '', pix: initial?.pix ?? '',
    observacoes: initial?.observacoes ?? '', status: initial?.status ?? 'ativo' as 'ativo' | 'inativo',
  }))
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.nome.trim()) return
    onSave({
      nome: f.nome.trim(), categoria: f.categoria || undefined, contato: f.contato || undefined,
      email: f.email || undefined, cnpj: f.cnpj || undefined, pix: f.pix || undefined,
      observacoes: f.observacoes || undefined, status: f.status,
    })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar fornecedor' : 'Novo fornecedor'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Nome" value={f.nome} onChange={e => setF(s => ({ ...s, nome: e.target.value }))} autoFocus />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#8b949e]">Categoria do que fornece</label>
          <select value={f.categoria} onChange={e => setF(s => ({ ...s, categoria: e.target.value }))}
            className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
            <option value="">Selecione…</option>
            {CATEGORIAS_FORN.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Contato/WhatsApp" value={f.contato} onChange={e => setF(s => ({ ...s, contato: e.target.value }))} />
          <Input label="E-mail" value={f.email} onChange={e => setF(s => ({ ...s, email: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="CNPJ (opcional)" value={f.cnpj} onChange={e => setF(s => ({ ...s, cnpj: e.target.value }))} />
          <Input label="Chave PIX (opcional)" value={f.pix} onChange={e => setF(s => ({ ...s, pix: e.target.value }))} />
        </div>
        <Input label="Observações" value={f.observacoes} onChange={e => setF(s => ({ ...s, observacoes: e.target.value }))} />
        <label className="flex items-center gap-2 text-sm text-[#e6edf3] cursor-pointer">
          <input type="checkbox" checked={f.status === 'ativo'} onChange={e => setF(s => ({ ...s, status: e.target.checked ? 'ativo' : 'inativo' }))} className="accent-[#e8a020] w-4 h-4" /> Ativo
        </label>
        <div className="flex gap-3"><Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" className="flex-1 text-white" style={{ background: '#e8a020' } as React.CSSProperties}>Salvar</Button></div>
      </form>
    </Modal>
  )
}
