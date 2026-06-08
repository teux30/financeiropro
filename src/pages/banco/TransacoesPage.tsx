import { useState, useMemo } from 'react'
import { Plus, Search, ArrowDownLeft, ArrowUpRight, Check, Trash2, Pencil, Sparkles } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Transacao, TransacaoTipo, CategoriaFin } from '../../store/bancoTypes'
import { CATEGORIAS, categoriasPorPerfil } from '../../store/bancoTypes'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { CategoriaIcon } from '../../lib/banco-ui'
import { fmtBRL, fmtData, labelDia, hoje, maskSaldo } from '../../lib/format'
import { CapturaIA } from './CapturaIA'

interface FormState {
  contaId: string; tipo: TransacaoTipo; valor: string; descricao: string
  categoria: CategoriaFin; data: string; observacoes: string; fornecedorNome: string
}

export function TransacoesPage() {
  const {
    perfilAtivo, getBanco, registrarTransacao, editarTransacao, excluirTransacao,
    toggleConferida, ocultarSaldos, getFornecedores, adicionarFornecedor,
  } = useStore()
  const fornecedores = perfilAtivo === 'empresa' ? getFornecedores() : []
  const banco = getBanco()
  const accent = perfilAtivo === 'pessoal' ? '#1d9e75' : '#e8a020'

  const catsEntrada: CategoriaFin[] = categoriasPorPerfil(perfilAtivo, 'entrada')
  const catsSaida: CategoriaFin[] = categoriasPorPerfil(perfilAtivo, 'saida')

  const [showModal, setShowModal] = useState(false)
  const [capturaOpen, setCapturaOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    contaId: '', tipo: 'saida', valor: '', descricao: '', categoria: catsSaida[0], data: hoje(), observacoes: '', fornecedorNome: '',
  })

  // filtros
  const [fConta, setFConta] = useState('todas')
  const [fTipo, setFTipo] = useState<'todos' | TransacaoTipo>('todos')
  const [fCat, setFCat] = useState<'todas' | CategoriaFin>('todas')
  const [busca, setBusca] = useState('')

  const filtradas = useMemo(() => {
    return banco.transacoes
      .filter(t => t.categoria !== 'transferencia')
      .filter(t => fConta === 'todas' || t.contaId === fConta)
      .filter(t => fTipo === 'todos' || t.tipo === fTipo)
      .filter(t => fCat === 'todas' || t.categoria === fCat)
      .filter(t => !busca || t.descricao.toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [banco.transacoes, fConta, fTipo, fCat, busca])

  const totEntradas = filtradas.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0)
  const totSaidas = filtradas.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0)

  // agrupar por dia
  const grupos = useMemo(() => {
    const map = new Map<string, Transacao[]>()
    filtradas.forEach(t => {
      const k = t.data.slice(0, 10)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(t)
    })
    return Array.from(map.entries())
  }, [filtradas])

  const contaCor = (id: string) => banco.contas.find(c => c.id === id)?.cor ?? '#64748b'
  const contaNome = (id: string) => banco.contas.find(c => c.id === id)?.nome ?? '—'

  const openNew = () => {
    if (banco.contas.length === 0) return
    const padrao = banco.contas.find(c => c.contaPadrao) ?? banco.contas[0]
    setForm({ contaId: padrao.id, tipo: 'saida', valor: '', descricao: '', categoria: catsSaida[0], data: hoje(), observacoes: '', fornecedorNome: '' })
    setEditId(null); setShowModal(true)
  }
  const openEdit = (t: Transacao) => {
    const fNome = t.fornecedorId ? (fornecedores.find(f => f.id === t.fornecedorId)?.nome ?? t.fornecedor ?? '') : (t.fornecedor ?? '')
    setForm({ contaId: t.contaId, tipo: t.tipo, valor: String(t.valor), descricao: t.descricao, categoria: t.categoria, data: t.data.slice(0, 10), observacoes: t.observacoes ?? '', fornecedorNome: fNome })
    setEditId(t.id); setShowModal(true)
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.contaId || !form.valor) return
    // fornecedor (só empresa, saída): vincula existente ou cadastra rápido
    let fornecedorId: string | undefined
    let fornecedor: string | undefined
    const fNome = form.fornecedorNome.trim()
    if (perfilAtivo === 'empresa' && form.tipo === 'saida' && fNome) {
      const existente = fornecedores.find(f => f.nome.toLowerCase() === fNome.toLowerCase())
      const forn = existente ?? adicionarFornecedor({ nome: fNome, status: 'ativo' })
      fornecedorId = forn.id; fornecedor = forn.nome
    }
    const payload = {
      contaId: form.contaId, tipo: form.tipo, valor: parseFloat(form.valor) || 0,
      descricao: form.descricao.trim() || CATEGORIAS[form.categoria].label,
      categoria: form.categoria, data: form.data, recorrente: false,
      observacoes: form.observacoes.trim() || undefined, fornecedorId, fornecedor, origemAuto: 'manual' as const,
    }
    if (editId) editarTransacao(editId, payload)
    else registrarTransacao(payload)
    setShowModal(false)
  }

  const catsForm = form.tipo === 'entrada' ? catsEntrada : catsSaida

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#e6edf3]">Transações</h1>
            <p className="text-xs sm:text-sm text-[#8b949e] mt-0.5">{filtradas.length} lançamentos</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setCapturaOpen(true)} variant="secondary" title="Capturar por foto (IA)">
              <Sparkles size={16} style={{ color: '#1d9e75' }} /> <span className="hidden sm:inline">Foto IA</span>
            </Button>
            <Button onClick={openNew} disabled={banco.contas.length === 0} className="text-white" style={{ background: accent } as React.CSSProperties}>
              <Plus size={16} /> <span className="hidden sm:inline">Nova</span>
            </Button>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl p-3 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-[11px] text-[#8b949e]">Entradas</p>
            <p className="text-sm sm:text-lg font-bold text-[#10b981]">{maskSaldo(fmtBRL(totEntradas), ocultarSaldos)}</p>
          </div>
          <div className="rounded-xl p-3 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-[11px] text-[#8b949e]">Saídas</p>
            <p className="text-sm sm:text-lg font-bold text-[#ef4444]">{maskSaldo(fmtBRL(totSaidas), ocultarSaldos)}</p>
          </div>
          <div className="rounded-xl p-3 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-[11px] text-[#8b949e]">Saldo</p>
            <p className="text-sm sm:text-lg font-bold" style={{ color: totEntradas - totSaidas >= 0 ? '#10b981' : '#ef4444' }}>
              {maskSaldo(fmtBRL(totEntradas - totSaidas), ocultarSaldos)}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[140px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
              className="w-full bg-[#141a14] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#1d9e75]" />
          </div>
          <select value={fConta} onChange={e => setFConta(e.target.value)} className="bg-[#141a14] border border-[#30363d] rounded-lg px-2.5 py-2 text-sm text-[#8b949e] focus:outline-none">
            <option value="todas">Todas contas</option>
            {banco.contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={fTipo} onChange={e => setFTipo(e.target.value as typeof fTipo)} className="bg-[#141a14] border border-[#30363d] rounded-lg px-2.5 py-2 text-sm text-[#8b949e] focus:outline-none">
            <option value="todos">Tipo</option>
            <option value="entrada">Entradas</option>
            <option value="saida">Saídas</option>
          </select>
          <select value={fCat} onChange={e => setFCat(e.target.value as typeof fCat)} className="bg-[#141a14] border border-[#30363d] rounded-lg px-2.5 py-2 text-sm text-[#8b949e] focus:outline-none">
            <option value="todas">Categoria</option>
            {[...catsEntrada, ...catsSaida].map(c => <option key={c} value={c}>{CATEGORIAS[c].label}</option>)}
          </select>
        </div>

        {/* Lista agrupada por dia */}
        {grupos.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <ArrowUpRight size={28} className="text-[#30363d] mb-3" />
            <p className="text-[#8b949e]">Nenhuma transação encontrada</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {grupos.map(([dia, txs]) => (
              <div key={dia}>
                <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">{labelDia(dia)}</p>
                <div className="flex flex-col gap-1.5">
                  {txs.map(t => (
                    <div key={t.id} className="group flex items-center gap-3 rounded-xl p-3 border transition-colors hover:border-[#30363d]"
                      style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.06)' }}>
                      <CategoriaIcon categoria={t.categoria} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#e6edf3] truncate">{t.descricao}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#8b949e]">
                            <span className="w-2 h-2 rounded-full" style={{ background: contaCor(t.contaId) }} />
                            {contaNome(t.contaId)}
                          </span>
                          <span className="text-[11px] text-[#484f58]">{fmtData(t.data)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: t.tipo === 'entrada' ? '#10b981' : '#ef4444' }}>
                          {t.tipo === 'entrada' ? '+' : '-'}{maskSaldo(fmtBRL(t.valor), ocultarSaldos)}
                        </span>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => toggleConferida(t.id)} title="Conferida"
                            className="p-1 rounded" style={{ color: t.conferida ? '#10b981' : '#484f58' }}><Check size={13} /></button>
                          <button onClick={() => openEdit(t)} className="p-1 rounded text-[#8b949e] hover:text-[#e6edf3]"><Pencil size={13} /></button>
                          <button onClick={() => excluirTransacao(t.id)} className="p-1 rounded text-[#8b949e] hover:text-[#ef4444]"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Editar transação' : 'Nova transação'}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {/* tipo toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setForm(f => ({ ...f, tipo: 'entrada', categoria: catsEntrada[0] }))}
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: form.tipo === 'entrada' ? '#10b98122' : '#141a14', color: form.tipo === 'entrada' ? '#10b981' : '#8b949e', border: `1px solid ${form.tipo === 'entrada' ? '#10b981' : '#30363d'}` }}>
              <ArrowDownLeft size={15} /> Entrada
            </button>
            <button type="button" onClick={() => setForm(f => ({ ...f, tipo: 'saida', categoria: catsSaida[0] }))}
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: form.tipo === 'saida' ? '#ef444422' : '#141a14', color: form.tipo === 'saida' ? '#ef4444' : '#8b949e', border: `1px solid ${form.tipo === 'saida' ? '#ef4444' : '#30363d'}` }}>
              <ArrowUpRight size={15} /> Saída
            </button>
          </div>
          <Input label="Valor (R$)" type="number" inputMode="decimal" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" autoFocus />
          <Input label="Descrição" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Mercado" />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#8b949e]">Conta</label>
              <select value={form.contaId} onChange={e => setForm(f => ({ ...f, contaId: e.target.value }))}
                className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
                {banco.contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#8b949e]">Categoria</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value as CategoriaFin }))}
                className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
                {catsForm.map(c => <option key={c} value={c}>{CATEGORIAS[c].label}</option>)}
              </select>
            </div>
          </div>
          <Input label="Data" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
          {perfilAtivo === 'empresa' && form.tipo === 'saida' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#8b949e]">Fornecedor (opcional)</label>
              <input list="forn-list" value={form.fornecedorNome} onChange={e => setForm(f => ({ ...f, fornecedorNome: e.target.value }))}
                placeholder="Selecione ou digite para cadastrar"
                className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#e8a020]" />
              <datalist id="forn-list">
                {fornecedores.map(f => <option key={f.id} value={f.nome} />)}
              </datalist>
              <p className="text-[11px] text-[#484f58]">Se digitar um nome novo, ele é cadastrado automaticamente.</p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1 text-white" style={{ background: accent } as React.CSSProperties}>Salvar</Button>
          </div>
        </form>
      </Modal>

      <CapturaIA open={capturaOpen} onClose={() => setCapturaOpen(false)} />
    </div>
  )
}
