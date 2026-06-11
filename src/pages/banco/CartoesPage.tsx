import { useState, useMemo } from 'react'
import { CreditCard, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Cartao, Bandeira, CategoriaFin } from '../../store/bancoTypes'
import { BANDEIRAS, categoriasPorPerfil, CATEGORIAS } from '../../store/bancoTypes'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { DatePicker } from '../../components/ui/DatePicker'
import { fmtBRL, fmtData, maskSaldo, hoje } from '../../lib/format'

const MES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const CORES = ['#820ad1', '#ec7000', '#cc092f', '#0070af', '#242424', '#21c25e', '#1d9e75', '#e8a020']

export function CartoesPage() {
  const {
    perfilAtivo, getBanco, ocultarSaldos,
    adicionarCartao, editarCartao, excluirCartao,
    adicionarGastoCartao, excluirGastoCartao,
    getFaturaCartao, getFaturaAberta, pagarFaturaCartao,
  } = useStore()
  const banco = getBanco()
  const accent = perfilAtivo === 'pessoal' ? '#1d9e75' : '#e8a020'
  const cartoes = banco.cartoes

  const now = new Date()
  const [sel, setSel] = useState<string | null>(null)
  const [ano, setAno] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [modalCartao, setModalCartao] = useState(false)
  const [editCartao, setEditCartao] = useState<Cartao | null>(null)
  const [modalGasto, setModalGasto] = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const cartaoSel = cartoes.find(c => c.id === sel) ?? null
  const fatura = useMemo(() => cartaoSel ? getFaturaCartao(cartaoSel.id, ano, mes) : null, [cartaoSel, ano, mes, getFaturaCartao])
  const mudarMes = (d: number) => { let m = mes + d, a = ano; if (m < 1) { m = 12; a-- } else if (m > 12) { m = 1; a++ } setMes(m); setAno(a) }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}22` }}><CreditCard size={18} style={{ color: accent }} /></div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#e6edf3]">Cartões</h1>
            <p className="text-xs text-[#8b949e]">{cartoes.length} cartão(ões) · faturas e limite</p>
          </div>
          <Button onClick={() => { setEditCartao(null); setModalCartao(true) }} className="text-white" style={{ background: accent } as React.CSSProperties}><Plus size={15} /> Novo</Button>
        </div>

        {cartoes.length === 0 ? (
          <p className="text-sm text-[#8b949e] text-center py-8">Nenhum cartão cadastrado.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cartoes.map(c => {
              const aberta = getFaturaAberta(c.id)
              const disp = c.limite - aberta
              const pctUso = c.limite > 0 ? Math.min(100, (aberta / c.limite) * 100) : 0
              return (
                <button key={c.id} onClick={() => setSel(sel === c.id ? null : c.id)}
                  className="text-left rounded-2xl p-4 relative overflow-hidden group" style={{ background: `linear-gradient(135deg, ${c.cor}, ${c.cor}bb)`, outline: sel === c.id ? `2px solid ${accent}` : 'none' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{c.nome}</p>
                      <p className="text-[11px] text-white/70">{c.bandeira} · fecha dia {c.diaFechamento} · vence {c.diaVencimento}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditCartao(c); setModalCartao(true) }} className="p-1 text-white/80 hover:text-white"><Pencil size={12} /></button>
                      <button onClick={() => setConfirmDel(c.id)} className="p-1 text-white/80 hover:text-white"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/70 mt-3">Fatura aberta</p>
                  <p className="text-xl font-black text-white">{maskSaldo(fmtBRL(aberta), ocultarSaldos)}</p>
                  <div className="h-1.5 rounded-full bg-white/20 overflow-hidden mt-2"><div className="h-full bg-white/80" style={{ width: `${pctUso}%` }} /></div>
                  <p className="text-[11px] text-white/70 mt-1">Disponível {maskSaldo(fmtBRL(disp), ocultarSaldos)} de {fmtBRL(c.limite)}</p>
                  {confirmDel === c.id && (
                    <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setConfirmDel(null)} className="flex-1 py-1.5 text-xs rounded-lg bg-black/30 text-white">Cancelar</button>
                      <button onClick={() => { excluirCartao(c.id); setConfirmDel(null); if (sel === c.id) setSel(null) }} className="flex-1 py-1.5 text-xs rounded-lg bg-[#da3633] text-white">Excluir</button>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Fatura do cartão selecionado */}
        {cartaoSel && fatura && (
          <div className="rounded-2xl p-5 border flex flex-col gap-3" style={{ background: '#141a14', borderColor: `${accent}33` }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#e6edf3]">Fatura — {cartaoSel.nome}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => mudarMes(-1)} className="p-1 text-[#8b949e] hover:text-[#e6edf3]"><ChevronLeft size={16} /></button>
                <span className="text-sm text-[#e6edf3]">{MES_NOMES[mes - 1]}/{ano}</span>
                <button onClick={() => mudarMes(1)} className="p-1 text-[#8b949e] hover:text-[#e6edf3]"><ChevronRight size={16} /></button>
              </div>
            </div>
            <p className="text-[11px] text-[#8b949e]">Período {fmtData(fatura.inicio)} – {fmtData(fatura.fim)} · vence {fmtData(fatura.vencimento)}</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black" style={{ color: accent }}>{maskSaldo(fmtBRL(fatura.total), ocultarSaldos)}</span>
              <Button onClick={() => setModalGasto(true)} variant="ghost"><Plus size={14} /> Gasto</Button>
            </div>

            {fatura.gastos.length === 0 ? (
              <p className="text-sm text-[#8b949e] text-center py-4">Sem gastos nesta fatura.</p>
            ) : (
              <div className="rounded-xl border overflow-hidden" style={{ background: '#0a0f0a', borderColor: 'rgba(255,255,255,0.06)' }}>
                {fatura.gastos.map(g => (
                  <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-[#21262d] last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#e6edf3] truncate">{g.descricao}{g.faturaPagaEm ? ' ✓' : ''}</p>
                      <p className="text-[11px] text-[#484f58]">{fmtData(g.data)} · {CATEGORIAS[g.categoria]?.label ?? g.categoria}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#ef4444]">{maskSaldo(fmtBRL(g.valor), ocultarSaldos)}</span>
                    {!g.faturaPagaEm && <button onClick={() => excluirGastoCartao(g.id)} className="text-[#484f58] hover:text-[#ef4444]"><X size={14} /></button>}
                  </div>
                ))}
              </div>
            )}

            {fatura.total > 0 && fatura.gastos.some(g => !g.faturaPagaEm) && (
              <PagarFatura contas={banco.contas} contaPadrao={cartaoSel.contaVinculadaId}
                onPagar={(contaId) => pagarFaturaCartao(cartaoSel.id, ano, mes, contaId)} />
            )}
          </div>
        )}
      </div>

      <CartaoForm open={modalCartao} onClose={() => setModalCartao(false)} initial={editCartao} accent={accent}
        contas={banco.contas} onSave={(d) => { if (editCartao) editarCartao(editCartao.id, d); else adicionarCartao(d) }} />

      {cartaoSel && (
        <GastoForm open={modalGasto} onClose={() => setModalGasto(false)} accent={accent} perfil={perfilAtivo}
          onSave={(d) => adicionarGastoCartao({ ...d, cartaoId: cartaoSel.id })} />
      )}
    </div>
  )
}

function PagarFatura({ contas, contaPadrao, onPagar }: {
  contas: { id: string; nome: string }[]; contaPadrao?: string; onPagar: (contaId: string) => void
}) {
  const [conta, setConta] = useState(contaPadrao ?? contas[0]?.id ?? '')
  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1 flex flex-col gap-1.5">
        <label className="text-xs text-[#8b949e]">Pagar fatura da conta</label>
        <select value={conta} onChange={e => setConta(e.target.value)} className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
          <option value="">Selecione…</option>
          {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      <Button disabled={!conta} onClick={() => conta && onPagar(conta)} className="text-white" style={{ background: '#1d9e75' } as React.CSSProperties}>Pagar fatura</Button>
    </div>
  )
}

function CartaoForm({ open, onClose, initial, accent, contas, onSave }: {
  open: boolean; onClose: () => void; initial: Cartao | null; accent: string
  contas: { id: string; nome: string }[]; onSave: (d: Omit<Cartao, 'id' | 'criadoEm'>) => void
}) {
  const [f, setF] = useState(() => ({
    nome: initial?.nome ?? '', bandeira: initial?.bandeira ?? 'Mastercard' as Bandeira,
    limite: String(initial?.limite ?? ''), diaFechamento: String(initial?.diaFechamento ?? '1'),
    diaVencimento: String(initial?.diaVencimento ?? '10'), contaVinculadaId: initial?.contaVinculadaId ?? '',
    cor: initial?.cor ?? CORES[0],
  }))
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); if (!f.nome.trim()) return
    onSave({
      nome: f.nome.trim(), bandeira: f.bandeira, limite: parseFloat(f.limite) || 0,
      diaFechamento: Math.min(31, Math.max(1, parseInt(f.diaFechamento) || 1)),
      diaVencimento: Math.min(31, Math.max(1, parseInt(f.diaVencimento) || 10)),
      contaVinculadaId: f.contaVinculadaId || undefined, cor: f.cor,
    })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar cartão' : 'Novo cartão'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Nome" value={f.nome} onChange={e => setF(s => ({ ...s, nome: e.target.value }))} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#8b949e]">Bandeira</label>
            <select value={f.bandeira} onChange={e => setF(s => ({ ...s, bandeira: e.target.value as Bandeira }))} className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
              {BANDEIRAS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <Input label="Limite (R$)" type="number" inputMode="decimal" value={f.limite} onChange={e => setF(s => ({ ...s, limite: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Dia de fechamento" type="number" value={f.diaFechamento} onChange={e => setF(s => ({ ...s, diaFechamento: e.target.value }))} />
          <Input label="Dia de vencimento" type="number" value={f.diaVencimento} onChange={e => setF(s => ({ ...s, diaVencimento: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#8b949e]">Conta que paga a fatura</label>
          <select value={f.contaVinculadaId} onChange={e => setF(s => ({ ...s, contaVinculadaId: e.target.value }))} className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
            <option value="">Nenhuma</option>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-[#8b949e] block mb-2">Cor</label>
          <div className="flex gap-2 flex-wrap">
            {CORES.map(c => <button key={c} type="button" onClick={() => setF(s => ({ ...s, cor: c }))} className="w-7 h-7 rounded-full" style={{ background: c, outline: f.cor === c ? '2px solid #fff' : 'none', outlineOffset: 2 }} />)}
          </div>
        </div>
        <div className="flex gap-3"><Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" className="flex-1 text-white" style={{ background: accent } as React.CSSProperties}>Salvar</Button></div>
      </form>
    </Modal>
  )
}

function GastoForm({ open, onClose, accent, perfil, onSave }: {
  open: boolean; onClose: () => void; accent: string; perfil: 'pessoal' | 'empresa'
  onSave: (d: { valor: number; descricao: string; categoria: CategoriaFin; data: string }) => void
}) {
  const cats = categoriasPorPerfil(perfil, 'saida')
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState<CategoriaFin>(cats[0])
  const [data, setData] = useState(hoje())
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); if (!valor) return
    onSave({ valor: parseFloat(valor) || 0, descricao: descricao.trim() || CATEGORIAS[categoria].label, categoria, data })
    setValor(''); setDescricao(''); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Gasto no cartão">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Valor (R$)" type="number" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} autoFocus />
        <Input label="Descrição" value={descricao} onChange={e => setDescricao(e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#8b949e]">Categoria</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaFin)} className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
            {cats.map(c => <option key={c} value={c}>{CATEGORIAS[c].label}</option>)}
          </select>
        </div>
        <DatePicker label="Data da compra" accent={accent} value={data} onChange={setData} />
        <div className="flex gap-3"><Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" className="flex-1 text-white" style={{ background: accent } as React.CSSProperties}>Adicionar</Button></div>
      </form>
    </Modal>
  )
}
