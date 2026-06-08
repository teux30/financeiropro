import { useState } from 'react'
import { Plus, ArrowUpCircle, ArrowDownCircle, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Insumo, MovimentoEstoque } from '../../store/empresaTypes'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { fmtData } from '../../lib/format'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
type InsumoStatus = 'OK' | 'BAIXO' | 'CRITICO'
const getInsumoStatus = (i: Insumo): InsumoStatus => {
  if (i.estoqueAtual === 0) return 'CRITICO'
  if (i.estoqueAtual <= i.estoqueMinimo) return 'BAIXO'
  return 'OK'
}
const STATUS_COLORS: Record<InsumoStatus, string> = { OK: '#10b981', BAIXO: '#f59e0b', CRITICO: '#ef4444' }

const EMPTY_INSUMO: Omit<Insumo, 'id'> = { nome: '', unidade: 'kg', estoqueAtual: 0, estoqueMinimo: 0, custoUnitario: 0, fornecedor: '' }

export function EstoquePage() {
  const { adicionarInsumo, atualizarInsumo, excluirInsumo, adicionarMovimento, adicionarContaPagar, getEmpresaAtiva } = useStore()
  const empresa = getEmpresaAtiva()

  const [showInsumoModal, setShowInsumoModal] = useState(false)
  const [editInsumo, setEditInsumo] = useState<Insumo | null>(null)
  const [insumoForm, setInsumoForm] = useState<Omit<Insumo, 'id'>>(EMPTY_INSUMO)

  const [showMovModal, setShowMovModal] = useState(false)
  const [selectedInsumoId, setSelectedInsumoId] = useState<string | null>(null)
  const [movTipo, setMovTipo] = useState<'entrada' | 'saida'>('entrada')
  const [movQtd, setMovQtd] = useState(0)
  const [movCusto, setMovCusto] = useState(0)
  const [movData, setMovData] = useState(new Date().toISOString().slice(0, 10))
  const [movObs, setMovObs] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  if (!empresa) return <div className="flex-1 flex items-center justify-center text-[#8b949e]">Nenhuma empresa configurada.</div>

  const { insumos, movimentosEstoque } = empresa
  const abaixoMinimo = insumos.filter(i => getInsumoStatus(i) !== 'OK').length
  const valorTotal = insumos.reduce((s, i) => s + i.estoqueAtual * i.custoUnitario, 0)
  const cmvEstimado = movimentosEstoque.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.quantidade * m.custoUnitario, 0)

  const openInsumoModal = (i?: Insumo) => {
    if (i) { setEditInsumo(i); setInsumoForm({ nome: i.nome, unidade: i.unidade, estoqueAtual: i.estoqueAtual, estoqueMinimo: i.estoqueMinimo, custoUnitario: i.custoUnitario, fornecedor: i.fornecedor }) }
    else { setEditInsumo(null); setInsumoForm(EMPTY_INSUMO) }
    setShowInsumoModal(true)
  }

  const handleInsumoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editInsumo) atualizarInsumo(empresa.id, editInsumo.id, insumoForm)
    else adicionarInsumo(empresa.id, insumoForm)
    setShowInsumoModal(false)
  }

  const openMovModal = (insumoId: string, tipo: 'entrada' | 'saida') => {
    setSelectedInsumoId(insumoId)
    setMovTipo(tipo)
    const ins = insumos.find(i => i.id === insumoId)
    setMovCusto(ins?.custoUnitario ?? 0)
    setMovQtd(0)
    setMovData(new Date().toISOString().slice(0, 10))
    setMovObs('')
    setShowMovModal(true)
  }

  const handleMovSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInsumoId) return
    const insumo = insumos.find(i => i.id === selectedInsumoId)
    if (!insumo) return

    const mov: Omit<MovimentoEstoque, 'id'> = { insumoId: selectedInsumoId, tipo: movTipo, quantidade: movQtd, custoUnitario: movCusto, data: movData, observacao: movObs }
    adicionarMovimento(empresa.id, mov)

    const novEstoque = movTipo === 'entrada' ? insumo.estoqueAtual + movQtd : Math.max(0, insumo.estoqueAtual - movQtd)
    atualizarInsumo(empresa.id, selectedInsumoId, { estoqueAtual: novEstoque })

    if (movTipo === 'entrada') {
      adicionarContaPagar(empresa.id, {
        descricao: `Compra: ${insumo.nome}`,
        valor: movQtd * movCusto,
        vencimento: movData,
        status: 'pendente',
        categoria: 'fornecedores',
        fornecedor: insumo.fornecedor,
      })
    }
    setShowMovModal(false)
  }

  const recentMov = [...movimentosEstoque].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 10)

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d1117]">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#e8a02022' }}>
              <Package size={18} style={{ color: '#e8a020' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#e6edf3]">Estoque e CMV</h1>
              <p className="text-xs text-[#8b949e]">{empresa.nome}</p>
            </div>
          </div>
          <Button onClick={() => openInsumoModal()} style={{ background: '#e8a020' } as React.CSSProperties} className="text-white">
            <Plus size={15} /> Novo insumo
          </Button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total insumos', value: String(insumos.length), color: '#8b949e' },
            { label: 'Abaixo do mínimo', value: String(abaixoMinimo), color: abaixoMinimo > 0 ? '#ef4444' : '#10b981' },
            { label: 'Valor em estoque', value: fmtBRL(valorTotal), color: '#e8a020' },
            { label: 'CMV estimado', value: fmtBRL(cmvEstimado), color: '#3b82f6' },
          ].map(k => (
            <div key={k.label} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
              <p className="text-xs text-[#8b949e] mb-1">{k.label}</p>
              <p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Insumos table */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#21262d]">
            <h2 className="text-sm font-semibold text-[#e6edf3]">Insumos</h2>
          </div>
          {insumos.length === 0 ? (
            <div className="p-8 text-center text-[#8b949e] text-sm">Nenhum insumo cadastrado ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#21262d]">
                    {['Nome', 'Und.', 'Atual', 'Mín.', 'Custo/Und', 'Valor Total', 'Status', 'Ações'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8b949e]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {insumos.map(ins => {
                    const st = getInsumoStatus(ins)
                    const stColor = STATUS_COLORS[st]
                    return (
                      <tr key={ins.id} className="border-b border-[#21262d] last:border-0 hover:bg-[#1c2128]">
                        <td className="px-4 py-3 text-[#e6edf3] font-medium">{ins.nome}</td>
                        <td className="px-4 py-3 text-[#8b949e]">{ins.unidade}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: stColor }}>{ins.estoqueAtual}</td>
                        <td className="px-4 py-3 text-[#8b949e]">{ins.estoqueMinimo}</td>
                        <td className="px-4 py-3 text-[#8b949e]">{fmtBRL(ins.custoUnitario)}</td>
                        <td className="px-4 py-3 text-[#e6edf3]">{fmtBRL(ins.estoqueAtual * ins.custoUnitario)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {st !== 'OK' && <AlertTriangle size={12} style={{ color: stColor }} />}
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${stColor}22`, color: stColor }}>{st}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openMovModal(ins.id, 'entrada')} className="p-1 rounded text-[#10b981] hover:bg-[#10b98122]" title="Registrar entrada">
                              <ArrowUpCircle size={13} />
                            </button>
                            <button onClick={() => openMovModal(ins.id, 'saida')} className="p-1 rounded text-[#ef4444] hover:bg-[#ef444422]" title="Registrar saída">
                              <ArrowDownCircle size={13} />
                            </button>
                            <button onClick={() => openInsumoModal(ins)} className="p-1 rounded text-[#8b949e] hover:text-[#e6edf3]"><Edit2 size={13} /></button>
                            {confirmDelete === ins.id ? (
                              <>
                                <button onClick={() => { excluirInsumo(empresa.id, ins.id); setConfirmDelete(null) }} className="p-1 rounded text-[#ef4444]">✓</button>
                                <button onClick={() => setConfirmDelete(null)} className="text-xs text-[#8b949e]">✕</button>
                              </>
                            ) : (
                              <button onClick={() => setConfirmDelete(ins.id)} className="p-1 rounded text-[#8b949e] hover:text-[#ef4444]"><Trash2 size={13} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent movements */}
        {recentMov.length > 0 && (
          <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#21262d]">
              <h2 className="text-sm font-semibold text-[#e6edf3]">Últimas movimentações</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#21262d]">
                  {['Data', 'Insumo', 'Tipo', 'Qtd', 'Custo Total'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8b949e]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentMov.map(m => {
                  const ins = insumos.find(i => i.id === m.insumoId)
                  return (
                    <tr key={m.id} className="border-b border-[#21262d] last:border-0 hover:bg-[#1c2128]">
                      <td className="px-4 py-2.5 text-[#8b949e]">{fmtData(m.data)}</td>
                      <td className="px-4 py-2.5 text-[#e6edf3]">{ins?.nome ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: m.tipo === 'entrada' ? '#10b98122' : '#ef444422', color: m.tipo === 'entrada' ? '#10b981' : '#ef4444' }}>
                          {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[#8b949e]">{m.quantidade} {ins?.unidade}</td>
                      <td className="px-4 py-2.5 text-[#e6edf3]">{fmtBRL(m.quantidade * m.custoUnitario)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Insumo Modal */}
        <Modal open={showInsumoModal} onClose={() => setShowInsumoModal(false)} title={editInsumo ? 'Editar insumo' : 'Novo insumo'}>
          <form onSubmit={handleInsumoSubmit} className="flex flex-col gap-4">
            <Input label="Nome" value={insumoForm.nome} onChange={e => setInsumoForm(f => ({ ...f, nome: e.target.value }))} required autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#8b949e]">Unidade</label>
                <select className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#e8a020]"
                  value={insumoForm.unidade} onChange={e => setInsumoForm(f => ({ ...f, unidade: e.target.value }))}>
                  {['kg', 'L', 'un', 'cx', 'pct', 'g', 'ml'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <Input label="Custo unitário (R$)" type="number" value={String(insumoForm.custoUnitario)} onChange={e => setInsumoForm(f => ({ ...f, custoUnitario: Number(e.target.value) }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Estoque atual" type="number" value={String(insumoForm.estoqueAtual)} onChange={e => setInsumoForm(f => ({ ...f, estoqueAtual: Number(e.target.value) }))} />
              <Input label="Estoque mínimo" type="number" value={String(insumoForm.estoqueMinimo)} onChange={e => setInsumoForm(f => ({ ...f, estoqueMinimo: Number(e.target.value) }))} />
            </div>
            <Input label="Fornecedor (opcional)" value={insumoForm.fornecedor ?? ''} onChange={e => setInsumoForm(f => ({ ...f, fornecedor: e.target.value }))} />
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowInsumoModal(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 text-white" style={{ background: '#e8a020' } as React.CSSProperties}>Salvar</Button>
            </div>
          </form>
        </Modal>

        {/* Movimento Modal */}
        <Modal open={showMovModal} onClose={() => setShowMovModal(false)} title={`Registrar ${movTipo === 'entrada' ? 'entrada' : 'saída'}`}>
          <form onSubmit={handleMovSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-[#8b949e]">
              Insumo: <strong className="text-[#e6edf3]">{insumos.find(i => i.id === selectedInsumoId)?.nome}</strong>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Quantidade" type="number" value={String(movQtd)} onChange={e => setMovQtd(Number(e.target.value))} required autoFocus />
              {movTipo === 'entrada' && (
                <Input label="Custo unitário (R$)" type="number" value={String(movCusto)} onChange={e => setMovCusto(Number(e.target.value))} />
              )}
            </div>
            <Input label="Data" type="date" value={movData} onChange={e => setMovData(e.target.value)} />
            <Input label="Observação (opcional)" value={movObs} onChange={e => setMovObs(e.target.value)} />
            {movTipo === 'entrada' && movQtd > 0 && movCusto > 0 && (
              <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] text-sm">
                <p className="text-[#8b949e]">Criará conta a pagar de <strong className="text-[#e8a020]">{fmtBRL(movQtd * movCusto)}</strong></p>
              </div>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowMovModal(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 text-white" style={{ background: movTipo === 'entrada' ? '#10b981' : '#ef4444' } as React.CSSProperties}>
                Confirmar
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  )
}
