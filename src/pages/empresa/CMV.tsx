import { useState, useMemo } from 'react'
import { Percent, ChevronLeft, ChevronRight, AlertTriangle, Target } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { fmtBRL } from '../../lib/format'

const MES_NOMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const META_PADRAO = 35

export function CMVPage() {
  const { getEmpresaAtiva, getBanco, getCardapio, getCustoItemCardapio } = useStore()
  const emp = getEmpresaAtiva()
  const now = new Date()
  const [ano, setAno] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)

  const prefix = `${ano}-${String(mes).padStart(2, '0')}`
  const banco = getBanco('empresa')

  const { faturamento, custoInsumos } = useMemo(() => {
    let fat = 0, cmv = 0
    banco.transacoes
      .filter(t => t.categoria !== 'transferencia' && !t.transferenciaId && t.data.startsWith(prefix))
      .forEach(t => {
        if (t.tipo === 'entrada') fat += t.valor
        else if (t.categoria === 'insumos') cmv += t.valor
      })
    return { faturamento: fat, custoInsumos: cmv }
  }, [banco.transacoes, prefix])

  const cmvPct = faturamento > 0 ? (custoInsumos / faturamento) * 100 : 0
  const meta = emp?.metas?.cmvMax || META_PADRAO

  // CMV teórico do cardápio (por item)
  const itens = getCardapio().filter(i => i.ativo)
  const porItem = itens.map(i => {
    const custo = getCustoItemCardapio(i)
    const cmv = i.precoVenda > 0 ? (custo / i.precoVenda) * 100 : 0
    return { nome: i.nome, custo, preco: i.precoVenda, cmv }
  }).sort((a, b) => b.cmv - a.cmv)
  const cmvMedioCardapio = porItem.length ? porItem.reduce((s, i) => s + i.cmv, 0) / porItem.length : 0

  // Vendas por item (realizado) — transações de entrada com itemCardapioId no mês
  const vendasPorItem = useMemo(() => {
    const cardapio = getCardapio()
    const map = new Map<string, { nome: string; receita: number; qtd: number; custo: number }>()
    banco.transacoes
      .filter(t => t.tipo === 'entrada' && t.itemCardapioId && t.data.startsWith(prefix))
      .forEach(t => {
        const item = cardapio.find(i => i.id === t.itemCardapioId)
        if (!item) return
        const cur = map.get(item.id) ?? { nome: item.nome, receita: 0, qtd: 0, custo: 0 }
        const q = t.quantidade ?? 1
        cur.receita += t.valor; cur.qtd += q; cur.custo += getCustoItemCardapio(item) * q
        map.set(item.id, cur)
      })
    return [...map.values()].map(v => ({ ...v, cmv: v.receita > 0 ? (v.custo / v.receita) * 100 : 0 })).sort((a, b) => b.cmv - a.cmv)
  }, [banco.transacoes, prefix, getCardapio, getCustoItemCardapio])

  const mudarMes = (d: number) => { let m = mes + d, a = ano; if (m < 1) { m = 12; a-- } else if (m > 12) { m = 1; a++ } setMes(m); setAno(a) }

  if (!emp) return <div className="flex-1 flex items-center justify-center text-[#8b949e]">Nenhuma empresa ativa.</div>

  const corCMV = (v: number) => v === 0 ? '#8b949e' : v <= meta - 5 ? '#1d9e75' : v <= meta ? '#e8a020' : '#ef4444'

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#e8a02022' }}><Percent size={18} style={{ color: '#e8a020' }} /></div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#e6edf3]">CMV</h1>
            <p className="text-xs text-[#8b949e]">Custo da mercadoria vendida</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => mudarMes(-1)} className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3]"><ChevronLeft size={18} /></button>
            <span className="text-sm font-medium text-[#e6edf3]">{MES_NOMES[mes - 1].slice(0, 3)}/{ano}</span>
            <button onClick={() => mudarMes(1)} className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3]"><ChevronRight size={18} /></button>
          </div>
        </div>

        {/* CMV realizado */}
        <div className="rounded-2xl p-6 border" style={{ background: '#141a14', borderColor: `${corCMV(cmvPct)}44` }}>
          <p className="text-xs uppercase tracking-wider text-[#8b949e]">CMV realizado do mês</p>
          <p className="text-5xl font-black mt-2" style={{ color: corCMV(cmvPct) }}>{cmvPct.toFixed(1)}%</p>
          <div className="flex items-center gap-2 mt-2 text-sm">
            <Target size={14} style={{ color: '#8b949e' }} />
            <span className="text-[#8b949e]">Meta: {meta}%</span>
            {cmvPct > meta && faturamento > 0 && <span className="flex items-center gap-1" style={{ color: '#ef4444' }}><AlertTriangle size={13} /> acima da meta</span>}
            {cmvPct > 0 && cmvPct <= meta && <span style={{ color: '#1d9e75' }}>dentro da meta ✓</span>}
          </div>
          {/* barra meta */}
          <div className="h-2.5 rounded-full bg-[#21262d] overflow-hidden mt-4 relative">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, cmvPct)}%`, background: corCMV(cmvPct) }} />
            <div className="absolute top-0 bottom-0 w-0.5 bg-white/60" style={{ left: `${Math.min(100, meta)}%` }} title={`Meta ${meta}%`} />
          </div>
        </div>

        {/* Números do mês */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-[11px] text-[#8b949e]">Faturamento (mês)</p><p className="text-lg font-bold text-[#1d9e75]">{fmtBRL(faturamento)}</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-[11px] text-[#8b949e]">Custo de insumos (mês)</p><p className="text-lg font-bold text-[#ef4444]">{fmtBRL(custoInsumos)}</p>
          </div>
        </div>
        <p className="text-[11px] text-[#484f58] -mt-2">
          CMV realizado = saídas de categoria "Insumos" ÷ faturamento do mês. Lance as compras de insumos como saída categoria Insumos para refletir aqui.
        </p>

        {/* Vendas por item (CMV realizado) */}
        {vendasPorItem.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">CMV realizado por prato (vendas vinculadas)</p>
            <div className="rounded-xl border overflow-hidden" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
              {vendasPorItem.map((v, idx) => (
                <div key={idx} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#21262d] last:border-0">
                  <span className="flex-1 text-sm text-[#e6edf3] truncate">{v.nome} <span className="text-[11px] text-[#8b949e]">×{v.qtd}</span></span>
                  <span className="text-[11px] text-[#8b949e]">{fmtBRL(v.custo)} / {fmtBRL(v.receita)}</span>
                  <span className="text-sm font-bold w-12 text-right" style={{ color: corCMV(v.cmv) }}>{v.cmv.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CMV teórico por item (cardápio) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">CMV teórico por prato</p>
            {porItem.length > 0 && <span className="text-xs text-[#8b949e]">médio {cmvMedioCardapio.toFixed(0)}%</span>}
          </div>
          {porItem.length === 0 ? (
            <p className="text-sm text-[#8b949e]">Cadastre itens no Cardápio (com preço e composição) para ver o CMV teórico.</p>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
              {porItem.map((i, idx) => (
                <div key={idx} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#21262d] last:border-0">
                  <span className="flex-1 text-sm text-[#e6edf3] truncate">{i.nome}</span>
                  <span className="text-[11px] text-[#8b949e]">{fmtBRL(i.custo)} / {fmtBRL(i.preco)}</span>
                  <span className="text-sm font-bold w-12 text-right" style={{ color: corCMV(i.cmv) }}>{i.cmv.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
