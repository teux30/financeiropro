import { useState, useMemo } from 'react'
import { BarChart3, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { CATEGORIAS, type CategoriaFin } from '../../store/bancoTypes'
import { fmtBRL, maskSaldo } from '../../lib/format'

const MES_NOMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// classificação das saídas no DRE
const CMV_CATS: CategoriaFin[] = ['insumos']
const DEDUCAO_CATS: CategoriaFin[] = ['impostos']

export default function DREAuto() {
  const { getEmpresaAtiva, getBanco, ocultarSaldos } = useStore()
  const emp = getEmpresaAtiva()
  const now = new Date()
  const [ano, setAno] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)
  const ym = `${ano}-${String(mes).padStart(2, '0')}`
  const banco = getBanco('empresa')

  const dre = useMemo(() => {
    const tx = banco.transacoes.filter(t => t.categoria !== 'transferencia' && !t.transferenciaId && t.data.startsWith(ym))
    const receitaBruta = tx.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0)
    const saidas = tx.filter(t => t.tipo === 'saida')
    const deducoes = saidas.filter(t => DEDUCAO_CATS.includes(t.categoria)).reduce((s, t) => s + t.valor, 0)
    const cmv = saidas.filter(t => CMV_CATS.includes(t.categoria)).reduce((s, t) => s + t.valor, 0)
    const despesasTx = saidas.filter(t => !DEDUCAO_CATS.includes(t.categoria) && !CMV_CATS.includes(t.categoria))
    const despesas = despesasTx.reduce((s, t) => s + t.valor, 0)
    // despesas por categoria
    const porCat = new Map<string, number>()
    despesasTx.forEach(t => porCat.set(t.categoria, (porCat.get(t.categoria) ?? 0) + t.valor))
    const receitaLiquida = receitaBruta - deducoes
    const lucroBruto = receitaLiquida - cmv
    const lucroLiquido = lucroBruto - despesas
    const margem = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0
    return { receitaBruta, deducoes, receitaLiquida, cmv, lucroBruto, despesas, lucroLiquido, margem, porCat: [...porCat.entries()].sort((a, b) => b[1] - a[1]) }
  }, [banco.transacoes, ym])

  const mudarMes = (d: number) => { let m = mes + d, a = ano; if (m < 1) { m = 12; a-- } else if (m > 12) { m = 1; a++ } setMes(m); setAno(a) }

  const exportCSV = () => {
    const linhas = [
      ['DRE', `${MES_NOMES[mes - 1]}/${ano}`],
      ['Receita Bruta', dre.receitaBruta.toFixed(2)],
      ['(-) Deduções/Impostos', dre.deducoes.toFixed(2)],
      ['= Receita Líquida', dre.receitaLiquida.toFixed(2)],
      ['(-) CMV', dre.cmv.toFixed(2)],
      ['= Lucro Bruto', dre.lucroBruto.toFixed(2)],
      ...dre.porCat.map(([c, v]) => [`   ${CATEGORIAS[c as CategoriaFin]?.label ?? c}`, v.toFixed(2)]),
      ['(-) Despesas Operacionais', dre.despesas.toFixed(2)],
      ['= Lucro Líquido', dre.lucroLiquido.toFixed(2)],
      ['Margem %', dre.margem.toFixed(1)],
    ]
    const csv = linhas.map(l => l.join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = `dre-${ym}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  if (!emp) return <div className="flex-1 flex items-center justify-center text-[#8b949e]">Nenhuma empresa ativa.</div>

  const Linha = ({ label, valor, tipo }: { label: string; valor: number; tipo?: 'receita' | 'deducao' | 'total' | 'sub' }) => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]"
      style={{ background: tipo === 'total' ? '#0a0f0a' : 'transparent' }}>
      <span className="text-sm" style={{ color: tipo === 'total' ? '#e6edf3' : '#8b949e', fontWeight: tipo === 'total' ? 700 : 400, paddingLeft: tipo === 'sub' ? 16 : 0 }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: tipo === 'receita' ? '#1d9e75' : tipo === 'deducao' ? '#ef4444' : tipo === 'total' ? (valor >= 0 ? '#1d9e75' : '#ef4444') : '#e6edf3' }}>
        {maskSaldo(fmtBRL(valor), ocultarSaldos)}
      </span>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#e8a02022' }}><BarChart3 size={18} style={{ color: '#e8a020' }} /></div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#e6edf3]">DRE</h1>
            <p className="text-xs text-[#8b949e]">Resultado do mês (automático das transações)</p>
          </div>
          <button onClick={exportCSV} className="p-2 rounded-lg bg-[#161b22] border border-[#21262d] text-[#8b949e] hover:text-[#e6edf3]" title="Exportar CSV"><Download size={16} /></button>
        </div>

        <div className="flex items-center justify-center gap-3 bg-[#161b22] border border-[#21262d] rounded-xl py-2">
          <button onClick={() => mudarMes(-1)} className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3]"><ChevronLeft size={18} /></button>
          <span className="text-sm font-medium text-[#e6edf3]">{MES_NOMES[mes - 1]} / {ano}</span>
          <button onClick={() => mudarMes(1)} className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3]"><ChevronRight size={18} /></button>
        </div>

        <div className="rounded-2xl border overflow-hidden" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <Linha label="Receita Bruta" valor={dre.receitaBruta} tipo="receita" />
          <Linha label="(−) Deduções / Impostos" valor={-dre.deducoes} tipo="deducao" />
          <Linha label="= Receita Líquida" valor={dre.receitaLiquida} tipo="total" />
          <Linha label="(−) CMV" valor={-dre.cmv} tipo="deducao" />
          <Linha label="= Lucro Bruto" valor={dre.lucroBruto} tipo="total" />
          {dre.porCat.map(([c, v]) => <Linha key={c} label={CATEGORIAS[c as CategoriaFin]?.label ?? c} valor={-v} tipo="sub" />)}
          <Linha label="(−) Despesas Operacionais" valor={-dre.despesas} tipo="deducao" />
          <Linha label="= Lucro Líquido" valor={dre.lucroLiquido} tipo="total" />
        </div>

        <div className="rounded-2xl p-5 border flex items-center justify-between" style={{ background: '#141a14', borderColor: `${dre.margem >= 0 ? '#1d9e75' : '#ef4444'}33` }}>
          <span className="text-sm text-[#8b949e]">Margem líquida</span>
          <span className="text-2xl font-black" style={{ color: dre.margem >= 15 ? '#1d9e75' : dre.margem >= 0 ? '#e8a020' : '#ef4444' }}>{dre.margem.toFixed(1)}%</span>
        </div>

        <p className="text-[11px] text-[#484f58]">
          Receitas = entradas; CMV = saídas de "Insumos"; Deduções = "Impostos"; Despesas operacionais = demais saídas. Tudo derivado das transações do mês.
        </p>
      </div>
    </div>
  )
}
