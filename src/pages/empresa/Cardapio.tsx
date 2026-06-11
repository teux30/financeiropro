import { useState, useMemo } from 'react'
import {
  UtensilsCrossed, Plus, Pencil, Trash2, Search, X, Check, AlertTriangle,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { ItemCardapio, ComposicaoItem } from '../../store/empresaTypes'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { fmtBRL } from '../../lib/format'

const CMV_ALTO = 35 // % acima disso = atenção

export function CardapioPage() {
  const {
    getEmpresaAtiva, getCardapio, getCustoItemCardapio,
    adicionarItemCardapio, atualizarItemCardapio, excluirItemCardapio,
  } = useStore()
  const emp = getEmpresaAtiva()
  const itens = getCardapio()
  const insumos = useMemo(() => emp?.insumos ?? [], [emp])

  const [busca, setBusca] = useState('')
  const [filtroCat, setFiltroCat] = useState('')
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<ItemCardapio | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  if (!emp) return <div className="flex-1 flex items-center justify-center text-[#8b949e]">Nenhuma empresa ativa.</div>

  const categorias = useMemo(() => [...new Set(itens.map(i => i.categoria).filter(Boolean))] as string[], [itens])
  const lista = itens
    .filter(i => !busca || i.nome.toLowerCase().includes(busca.toLowerCase()))
    .filter(i => !filtroCat || i.categoria === filtroCat)

  const dados = (i: ItemCardapio) => {
    const custo = getCustoItemCardapio(i)
    const margem = i.precoVenda > 0 ? ((i.precoVenda - custo) / i.precoVenda) * 100 : 0
    const cmv = i.precoVenda > 0 ? (custo / i.precoVenda) * 100 : 0
    return { custo, margem, cmv }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#e8a02022' }}><UtensilsCrossed size={18} style={{ color: '#e8a020' }} /></div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#e6edf3]">Cardápio</h1>
            <p className="text-xs text-[#8b949e]">{itens.length} item(ns) · custo calculado dos insumos (+10% segurança)</p>
          </div>
          <Button onClick={() => { setEdit(null); setModal(true) }} className="text-white" style={{ background: '#e8a020' } as React.CSSProperties}><Plus size={15} /> Novo</Button>
        </div>

        {insumos.length === 0 && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: '#e8a02011', color: '#e8a020' }}>
            <AlertTriangle size={14} /> Cadastre insumos (Estoque e CMV) para calcular o custo dos pratos automaticamente.
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[140px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar prato..."
              className="w-full bg-[#141a14] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#e8a020]" />
          </div>
          {categorias.length > 0 && (
            <select value={filtroCat} onChange={e => setFiltroCat(e.target.value)} className="bg-[#141a14] border border-[#30363d] rounded-lg px-2.5 py-2 text-sm text-[#8b949e] focus:outline-none">
              <option value="">Todas categorias</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>

        {/* Lista */}
        {lista.length === 0 ? (
          <p className="text-sm text-[#8b949e] text-center py-8">Nenhum item no cardápio. Cadastre o primeiro prato!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lista.map(i => {
              const { custo, margem, cmv } = dados(i)
              const cmvAlto = cmv > CMV_ALTO
              return (
                <div key={i.id} className="rounded-xl border p-4 group" style={{ background: '#141a14', borderColor: i.ativo ? '#e8a02033' : 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#e6edf3] truncate">{i.nome}{!i.ativo && <span className="text-[10px] text-[#8b949e]"> · inativo</span>}</p>
                      <p className="text-[11px] text-[#8b949e]">{i.categoria || 'Sem categoria'}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEdit(i); setModal(true) }} className="p-1 text-[#8b949e] hover:text-[#e6edf3]"><Pencil size={13} /></button>
                      <button onClick={() => setConfirmDel(i.id)} className="p-1 text-[#8b949e] hover:text-[#ef4444]"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div><p className="text-[10px] text-[#8b949e]">Preço</p><p className="text-xs font-bold text-[#e6edf3]">{fmtBRL(i.precoVenda)}</p></div>
                    <div><p className="text-[10px] text-[#8b949e]">Custo</p><p className="text-xs font-bold text-[#e6edf3]">{fmtBRL(custo)}</p></div>
                    <div><p className="text-[10px] text-[#8b949e]">Margem</p><p className="text-xs font-bold" style={{ color: margem >= 50 ? '#1d9e75' : margem >= 30 ? '#e8a020' : '#ef4444' }}>{margem.toFixed(0)}%</p></div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-[#8b949e]">CMV {cmv.toFixed(0)}%</span>
                    {cmvAlto && <span className="flex items-center gap-1" style={{ color: '#ef4444' }}><AlertTriangle size={11} /> alto</span>}
                  </div>
                  {confirmDel === i.id && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setConfirmDel(null)} className="flex-1 py-1.5 text-xs rounded-lg bg-[#21262d] text-[#8b949e]">Cancelar</button>
                      <button onClick={() => { excluirItemCardapio(i.id); setConfirmDel(null) }} className="flex-1 py-1.5 text-xs rounded-lg bg-[#da3633] text-white">Excluir</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ItemForm open={modal} onClose={() => setModal(false)} initial={edit}
        insumos={insumos}
        onSave={(d) => { if (edit) atualizarItemCardapio(edit.id, d); else adicionarItemCardapio(d) }} />
    </div>
  )
}

function ItemForm({ open, onClose, initial, insumos, onSave }: {
  open: boolean; onClose: () => void; initial: ItemCardapio | null
  insumos: { id: string; nome: string; unidade: string; custoUnitario: number }[]
  onSave: (d: Omit<ItemCardapio, 'id' | 'criadoEm'>) => void
}) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [categoria, setCategoria] = useState(initial?.categoria ?? '')
  const [precoVenda, setPrecoVenda] = useState(String(initial?.precoVenda ?? ''))
  const [descricao, setDescricao] = useState(initial?.descricao ?? '')
  const [ativo, setAtivo] = useState(initial?.ativo ?? true)
  const [comp, setComp] = useState<ComposicaoItem[]>(initial?.composicao ?? [])
  const [novoInsumo, setNovoInsumo] = useState('')
  const [novaQtd, setNovaQtd] = useState('')
  const [custoManual, setCustoManual] = useState(String(initial?.custoManual ?? ''))

  const custoComposicao = comp.reduce((s, c) => {
    const ins = insumos.find(i => i.id === c.insumoId)
    return s + (ins ? ins.custoUnitario * c.quantidade : 0)
  }, 0)
  const custoFinal = comp.length > 0 ? custoComposicao * 1.1 : (parseFloat(custoManual) || 0)
  const preco = parseFloat(precoVenda) || 0
  const margem = preco > 0 ? ((preco - custoFinal) / preco) * 100 : 0

  const addInsumo = () => {
    if (!novoInsumo || !novaQtd) return
    setComp(c => [...c.filter(x => x.insumoId !== novoInsumo), { insumoId: novoInsumo, quantidade: parseFloat(novaQtd) || 0 }])
    setNovoInsumo(''); setNovaQtd('')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    onSave({
      nome: nome.trim(), categoria: categoria || undefined, precoVenda: preco,
      composicao: comp, custoManual: comp.length === 0 ? (parseFloat(custoManual) || 0) : undefined,
      descricao: descricao || undefined, ativo,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar item' : 'Novo item do cardápio'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Nome do prato" value={nome} onChange={e => setNome(e.target.value)} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Categoria" value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ex: Lanches" />
          <Input label="Preço de venda (R$)" type="number" inputMode="decimal" value={precoVenda} onChange={e => setPrecoVenda(e.target.value)} placeholder="0,00" />
        </div>

        {/* Composição */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#8b949e]">Composição (insumos)</label>
          {comp.map(c => {
            const ins = insumos.find(i => i.id === c.insumoId)
            return (
              <div key={c.insumoId} className="flex items-center gap-2 bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2">
                <span className="flex-1 text-sm text-[#e6edf3]">{ins?.nome ?? 'insumo'} <span className="text-[11px] text-[#8b949e]">· {c.quantidade} {ins?.unidade}</span></span>
                <span className="text-xs text-[#8b949e]">{fmtBRL((ins?.custoUnitario ?? 0) * c.quantidade)}</span>
                <button type="button" onClick={() => setComp(x => x.filter(i => i.insumoId !== c.insumoId))} className="text-[#484f58] hover:text-[#ef4444]"><X size={14} /></button>
              </div>
            )
          })}
          {insumos.length > 0 ? (
            <div className="flex gap-2">
              <select value={novoInsumo} onChange={e => setNovoInsumo(e.target.value)} className="flex-1 bg-[#0a0f0a] border border-[#30363d] rounded-lg px-2 py-2 text-sm text-[#e6edf3] focus:outline-none">
                <option value="">Insumo…</option>
                {insumos.map(i => <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>)}
              </select>
              <input value={novaQtd} onChange={e => setNovaQtd(e.target.value)} inputMode="decimal" placeholder="qtd"
                className="w-20 bg-[#0a0f0a] border border-[#30363d] rounded-lg px-2 py-2 text-sm text-[#e6edf3] focus:outline-none" />
              <Button type="button" size="sm" onClick={addInsumo}><Plus size={14} /></Button>
            </div>
          ) : (
            <p className="text-[11px] text-[#484f58]">Sem insumos cadastrados — informe o custo manual abaixo.</p>
          )}
          {comp.length === 0 && (
            <Input label="Custo manual (R$)" type="number" inputMode="decimal" value={custoManual} onChange={e => setCustoManual(e.target.value)} placeholder="0,00" />
          )}
        </div>

        {/* Resumo de custo */}
        <div className="rounded-xl p-3 grid grid-cols-3 gap-2 text-center" style={{ background: '#0a0f0a', border: '1px solid #21262d' }}>
          <div><p className="text-[10px] text-[#8b949e]">Custo {comp.length > 0 ? '(+10%)' : ''}</p><p className="text-sm font-bold text-[#e6edf3]">{fmtBRL(custoFinal)}</p></div>
          <div><p className="text-[10px] text-[#8b949e]">Preço</p><p className="text-sm font-bold text-[#e6edf3]">{fmtBRL(preco)}</p></div>
          <div><p className="text-[10px] text-[#8b949e]">Margem</p><p className="text-sm font-bold" style={{ color: margem >= 50 ? '#1d9e75' : margem >= 30 ? '#e8a020' : '#ef4444' }}>{margem.toFixed(0)}%</p></div>
        </div>

        <Input label="Descrição (opcional)" value={descricao} onChange={e => setDescricao(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-[#e6edf3] cursor-pointer">
          <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} className="accent-[#e8a020] w-4 h-4" /> Ativo (à venda)
        </label>
        <div className="flex gap-3"><Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" className="flex-1 text-white" style={{ background: '#e8a020' } as React.CSSProperties}><Check size={15} /> Salvar</Button></div>
      </form>
    </Modal>
  )
}
