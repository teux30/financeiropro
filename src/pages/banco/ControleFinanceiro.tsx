import { useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, PiggyBank, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { CategoriaFin } from '../../store/bancoTypes'
import { CATEGORIAS, categoriasPorPerfil } from '../../store/bancoTypes'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { fmtBRL, fmtBRLshort, maskSaldo, mesAtual, MESES_CURTO } from '../../lib/format'

export function ControleFinanceiro() {
  const {
    perfilAtivo, getBanco, getControle, setOrcamento, setReservaEmergencia,
    getReceitasMes, getDespesasMes, getTaxaPoupanca, simParams, ocultarSaldos,
    getEmpresaAtiva,
  } = useStore()

  const isPessoal = perfilAtivo === 'pessoal'
  const accent = isPessoal ? '#1d9e75' : '#e8a020'
  const banco = getBanco()
  const controle = getControle()
  const [mes, setMes] = useState(mesAtual())

  const receitas = getReceitasMes(mes)
  const despesas = getDespesasMes(mes)
  const saldo = receitas - despesas
  const taxaPoupanca = getTaxaPoupanca(mes)

  // despesas por categoria (pizza)
  const porCategoria = useMemo(() => {
    const map = new Map<CategoriaFin, number>()
    banco.transacoes
      .filter(t => t.tipo === 'saida' && t.categoria !== 'transferencia' && t.data.slice(0, 7) === mes)
      .forEach(t => map.set(t.categoria, (map.get(t.categoria) ?? 0) + t.valor))
    return Array.from(map.entries())
      .map(([cat, valor]) => ({ cat, nome: CATEGORIAS[cat].label, valor, cor: CATEGORIAS[cat].cor }))
      .sort((a, b) => b.valor - a.valor)
  }, [banco.transacoes, mes])

  // 6 meses receitas vs despesas
  const seriesMensal = useMemo(() => {
    const arr: { label: string; receitas: number; despesas: number }[] = []
    const [y, m] = mes.split('-').map(Number)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      arr.push({
        label: MESES_CURTO[d.getMonth()],
        receitas: getReceitasMes(key),
        despesas: getDespesasMes(key),
      })
    }
    return arr
  }, [mes, getReceitasMes, getDespesasMes])

  // sobra para investir vs meta de aporte
  const metaAporte = simParams.mensal
  const sobra = Math.max(0, saldo)
  const comprometeAporte = isPessoal && metaAporte > 0 && sobra < metaAporte

  // ─── Orçamento ──────────────────────────────────────────────────────────────
  const catsDespesa = categoriasPorPerfil(perfilAtivo, 'saida')
  const [novoOrcCat, setNovoOrcCat] = useState<CategoriaFin>(catsDespesa[0])
  const [novoOrcLimite, setNovoOrcLimite] = useState('')

  const gastoPorCategoria = (cat: CategoriaFin) =>
    banco.transacoes
      .filter(t => t.categoria === cat && t.data.slice(0, 7) === mes)
      .reduce((s, t) => s + t.valor, 0)

  const addOrcamento = () => {
    const limite = parseFloat(novoOrcLimite)
    if (!limite || limite <= 0) return
    const existe = controle.orcamento.some(o => o.categoria === novoOrcCat)
    const novo = existe
      ? controle.orcamento.map(o => o.categoria === novoOrcCat ? { ...o, limite } : o)
      : [...controle.orcamento, { categoria: novoOrcCat, limite }]
    setOrcamento(novo)
    setNovoOrcLimite('')
  }
  const removeOrcamento = (cat: CategoriaFin) =>
    setOrcamento(controle.orcamento.filter(o => o.categoria !== cat))

  // ─── Centro de custos (empresa) ───────────────────────────────────────────────
  const centroCustos = useMemo(() => {
    if (isPessoal) return []
    const emp = getEmpresaAtiva()
    const areas = emp?.centroCustos ?? []
    // mapeia categorias de saída → área (heurística simples por nome)
    const mapaArea: Record<string, string> = {
      insumos: 'Cozinha', folha: 'Administrativo', aluguel: 'Administrativo',
      utilidades: 'Salão', manutencao: 'Salão', marketing: 'Marketing',
      impostos: 'Administrativo', outros_saida: 'Administrativo',
    }
    const totais = new Map<string, number>()
    banco.transacoes
      .filter(t => t.tipo === 'saida' && t.categoria !== 'transferencia' && t.data.slice(0, 7) === mes)
      .forEach(t => {
        const area = mapaArea[t.categoria] ?? 'Administrativo'
        totais.set(area, (totais.get(area) ?? 0) + t.valor)
      })
    return areas.map(a => ({
      area: a.area, cor: a.cor, valor: totais.get(a.area) ?? 0,
      pct: receitas > 0 ? ((totais.get(a.area) ?? 0) / receitas) * 100 : 0,
    }))
  }, [isPessoal, getEmpresaAtiva, banco.transacoes, mes, receitas])

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#e6edf3]">Controle Financeiro</h1>
            <p className="text-xs sm:text-sm text-[#8b949e] mt-0.5">{isPessoal ? 'Receitas e despesas pessoais' : 'Centro de custos da empresa'}</p>
          </div>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            className="bg-[#141a14] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none" />
        </div>

        {/* KPIs do mês */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-1.5 mb-1"><TrendingUp size={13} className="text-[#10b981]" /><span className="text-[11px] text-[#8b949e]">Receitas</span></div>
            <p className="text-lg font-bold text-[#10b981]">{maskSaldo(fmtBRL(receitas), ocultarSaldos)}</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-1.5 mb-1"><TrendingDown size={13} className="text-[#ef4444]" /><span className="text-[11px] text-[#8b949e]">Despesas</span></div>
            <p className="text-lg font-bold text-[#ef4444]">{maskSaldo(fmtBRL(despesas), ocultarSaldos)}</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <span className="text-[11px] text-[#8b949e]">Saldo do mês</span>
            <p className="text-lg font-bold" style={{ color: saldo >= 0 ? '#10b981' : '#ef4444' }}>{maskSaldo(fmtBRL(saldo), ocultarSaldos)}</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-1.5 mb-1"><PiggyBank size={13} style={{ color: accent }} /><span className="text-[11px] text-[#8b949e]">Taxa poupança</span></div>
            <p className="text-lg font-bold" style={{ color: accent }}>{taxaPoupanca.toFixed(0)}%</p>
          </div>
        </div>

        {/* Alerta de aporte (pessoal) */}
        {comprometeAporte && (
          <div className="rounded-xl p-3 border flex items-center gap-2.5" style={{ background: '#ef444411', borderColor: '#ef444433' }}>
            <AlertTriangle size={16} className="text-[#ef4444] shrink-0" />
            <p className="text-xs text-[#ef4444]">
              Sua sobra deste mês ({fmtBRL(sobra)}) está abaixo da meta de aporte ({fmtBRL(metaAporte)}).
            </p>
          </div>
        )}
        {isPessoal && metaAporte > 0 && !comprometeAporte && saldo > 0 && (
          <div className="rounded-xl p-3 border flex items-center gap-2.5" style={{ background: `${accent}11`, borderColor: `${accent}33` }}>
            <PiggyBank size={16} style={{ color: accent }} className="shrink-0" />
            <p className="text-xs" style={{ color: accent }}>
              Você tem {fmtBRL(sobra)} de sobra — suficiente para o aporte de {fmtBRL(metaAporte)}. 👏
            </p>
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pizza por categoria */}
          <div className="rounded-2xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-sm font-semibold text-[#e6edf3] mb-3">Para onde vai o dinheiro</p>
            {porCategoria.length === 0 ? (
              <p className="text-xs text-[#8b949e] text-center py-12">Sem despesas neste mês.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={porCategoria} dataKey="valor" nameKey="nome" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {porCategoria.map((d, i) => <Cell key={i} fill={d.cor} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtBRL(Number(v))} contentStyle={{ background: '#141a14', border: '1px solid #30363d', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#8b949e' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Barras 6 meses */}
          <div className="rounded-2xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-sm font-semibold text-[#e6edf3] mb-3">Receitas vs Despesas (6 meses)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={seriesMensal} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmtBRLshort(v)} tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip formatter={(v) => fmtBRL(Number(v))} contentStyle={{ background: '#141a14', border: '1px solid #30363d', borderRadius: 8 }} />
                <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Centro de custos (empresa) */}
        {!isPessoal && centroCustos.length > 0 && (
          <div className="rounded-2xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-sm font-semibold text-[#e6edf3] mb-3">Centro de custos por área</p>
            <div className="flex flex-col gap-3">
              {centroCustos.map(c => (
                <div key={c.area}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-[#e6edf3]"><span className="w-2 h-2 rounded-full" style={{ background: c.cor }} />{c.area}</span>
                    <span className="text-[#8b949e]">{maskSaldo(fmtBRL(c.valor), ocultarSaldos)} · {c.pct.toFixed(0)}% do fat.</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#21262d] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.pct)}%`, background: c.cor }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orçamento por categoria (pessoal) */}
        {isPessoal && (
          <div className="rounded-2xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-sm font-semibold text-[#e6edf3] mb-3">Orçamento por categoria</p>

            {/* lista */}
            <div className="flex flex-col gap-3 mb-4">
              {controle.orcamento.length === 0 && <p className="text-xs text-[#8b949e]">Defina limites para acompanhar seus gastos.</p>}
              {controle.orcamento.map(o => {
                const gasto = gastoPorCategoria(o.categoria)
                const pct = o.limite > 0 ? (gasto / o.limite) * 100 : 0
                const cor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#e8a020' : CATEGORIAS[o.categoria].cor
                return (
                  <div key={o.categoria}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#e6edf3]">{CATEGORIAS[o.categoria].label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#8b949e]">{fmtBRL(gasto)} / {fmtBRL(o.limite)}</span>
                        <button onClick={() => removeOrcamento(o.categoria)} className="text-[#484f58] hover:text-[#ef4444]"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-[#21262d] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: cor }} />
                    </div>
                    {pct >= 80 && (
                      <p className="text-[11px] mt-1" style={{ color: cor }}>
                        {pct >= 100 ? '⚠️ Limite ultrapassado!' : '⚠️ Você já usou 80% do limite'}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* adicionar */}
            <div className="flex flex-col sm:flex-row gap-2 items-end">
              <div className="flex flex-col gap-1.5 flex-1 w-full">
                <label className="text-xs font-medium text-[#8b949e]">Categoria</label>
                <select value={novoOrcCat} onChange={e => setNovoOrcCat(e.target.value as CategoriaFin)}
                  className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
                  {catsDespesa.map(c => <option key={c} value={c}>{CATEGORIAS[c].label}</option>)}
                </select>
              </div>
              <div className="w-full sm:w-32"><Input label="Limite (R$)" type="number" inputMode="decimal" value={novoOrcLimite} onChange={e => setNovoOrcLimite(e.target.value)} placeholder="0,00" /></div>
              <Button onClick={addOrcamento} className="text-white shrink-0" style={{ background: accent } as React.CSSProperties}><Plus size={15} /> Definir</Button>
            </div>
          </div>
        )}

        {/* Reserva de emergência (pessoal) */}
        {isPessoal && (
          <div className="rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center gap-3 justify-between" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div>
              <p className="text-sm font-semibold text-[#e6edf3]">Reserva de emergência</p>
              <p className="text-xs text-[#8b949e]">Compõe seu patrimônio total</p>
            </div>
            <div className="w-full sm:w-48">
              <Input type="number" inputMode="decimal" value={String(controle.reservaEmergencia || '')}
                onChange={e => setReservaEmergencia(parseFloat(e.target.value) || 0)} placeholder="0,00" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
