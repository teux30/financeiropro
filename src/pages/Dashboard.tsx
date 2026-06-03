import { useMemo, useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  User, Building2, ArrowRight, TrendingUp, Target, Sparkles, Wallet, ArrowLeftRight,
  Eye, EyeOff, PiggyBank, Clock,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { PainelDestaque } from '../components/dashboard/PainelDestaque'
import { fmtBRL, fmtBRLshort, maskSaldo } from '../lib/format'
import { useCountUp } from '../lib/banco-ui'
import { patrimonioAlvo } from '../store/objetivoTypes'
import {
  totalComRendimentos, progressoPercentual, statusRitmo, dadosGrafico,
} from '../store/objetivoSelectors'

type Visao = 'tudo' | 'pessoal' | 'empresa'

const hojeMes = () => new Date().toISOString().slice(0, 7)
const daysUntil = (d: string) => Math.floor((new Date(d).getTime() - Date.now()) / 86400000)

export function Dashboard() {
  const s = useStore()
  const {
    setActiveView, setPerfilAtivo, ocultarSaldos, setOcultarSaldos,
    getPatrimonioLiquidoTotal, getRendaMensalTotal, getRendaPassivaMensal,
    getDespesasPessoaisMensais, getIndependenciaFinanceira, getProjecaoIndependencia,
    getSaldoTotal, getReceitasMes, getDespesasMes, getTaxaPoupanca,
    getFluxoConsolidadoMes, getDadosGraficoMestre,
    simParams, separacao, empresas, objetivos, aportesReais,
  } = s

  const [visao, setVisao] = useState<Visao>('tudo')
  const [periodo, setPeriodo] = useState<6 | 12 | 24>(12)
  const mes = hojeMes()

  const verPessoal = visao !== 'empresa'
  const verEmpresa = visao !== 'pessoal'

  // ── consolidado ──────────────────────────────────────────────────────────
  const patrimonioTotal = getPatrimonioLiquidoTotal()
  const rendaTotal = getRendaMensalTotal()
  const patAnim = useCountUp(patrimonioTotal)

  // variação do mês (saldo consolidado deste mês vs anterior)
  const variacao = useMemo(() => {
    const atual = getFluxoConsolidadoMes(mes).saldo
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    const ant = getFluxoConsolidadoMes(d.toISOString().slice(0, 7)).saldo
    if (ant === 0) return atual === 0 ? 0 : 100
    return ((atual - ant) / Math.abs(ant)) * 100
  }, [getFluxoConsolidadoMes, mes])

  // sparkline (saldo mensal dos últimos 12)
  const sparkData = useMemo(() =>
    getDadosGraficoMestre(12).map(d => ({ v: d.total })),
    [getDadosGraficoMestre])

  // ── pessoal ──────────────────────────────────────────────────────────────
  const rendaPassiva = getRendaPassivaMensal()
  const saldoPessoal = getSaldoTotal('pessoal')
  const recPessoal = getReceitasMes(mes, 'pessoal')
  const despPessoal = getDespesasMes(mes, 'pessoal')
  const taxaPoup = getTaxaPoupanca(mes, 'pessoal')
  const metaRenda = simParams.meta
  const progMetaRenda = metaRenda > 0 ? Math.min(100, (rendaPassiva / metaRenda) * 100) : 0

  // ── empresa (agrega todas) ───────────────────────────────────────────────
  const emp = useMemo(() => {
    let fat = 0, custos = 0, cmvValor = 0, caixa = 0, aVencer7 = 0, contasVencendo: { desc: string; valor: number; dias: number }[] = []
    empresas.forEach(e => {
      const txs = e.banco?.transacoes ?? []
      txs.filter(t => t.categoria !== 'transferencia' && t.data.slice(0, 7) === mes).forEach(t => {
        if (t.tipo === 'entrada') fat += t.valor
        else { custos += t.valor; if (t.categoria === 'insumos') cmvValor += t.valor }
      })
      // caixa
      ;(e.banco?.contas ?? []).forEach(c => {
        const delta = txs.filter(t => t.contaId === c.id).reduce((d, t) => d + (t.tipo === 'entrada' ? t.valor : -t.valor), 0)
        caixa += c.saldoInicial + delta
      })
      // contas a pagar vencendo em 7 dias
      ;(e.contasPagar ?? []).filter(c => c.status === 'pendente').forEach(c => {
        const dias = daysUntil(c.vencimento)
        if (dias >= 0 && dias <= 7) { aVencer7 += c.valor; contasVencendo.push({ desc: c.descricao, valor: c.valor, dias }) }
      })
    })
    const lucro = Math.max(0, fat - custos)
    const margem = fat > 0 ? (lucro / fat) * 100 : 0
    const cmvPct = fat > 0 ? (cmvValor / fat) * 100 : 0
    const metaFat = empresas[0]?.metas?.faturamento ?? 0
    return { fat, custos, lucro, margem, cmvPct, caixa, aVencer7, contasVencendo, metaFat }
  }, [empresas, mes])

  const saudeEmpresa: { cor: string; emoji: string; texto: string } = (() => {
    let score = 0
    if (emp.margem >= 15) score++
    if (emp.cmvPct > 0 && emp.cmvPct < 30) score++
    if (emp.caixa > 0) score++
    if (score >= 3) return { cor: '#1d9e75', emoji: '🟢', texto: 'Saudável' }
    if (score >= 1) return { cor: '#e8a020', emoji: '🟡', texto: 'Atenção' }
    return { cor: '#ef4444', emoji: '🔴', texto: 'Crítico' }
  })()

  // ── conexão ──────────────────────────────────────────────────────────────
  const proLaboreMes = useMemo(() => {
    const ano = new Date().getFullYear(), m = new Date().getMonth() + 1
    return separacao.historico.filter(h => h.ano === ano && h.mes === m).reduce((sum, h) => sum + h.valor, 0) || separacao.proLabore
  }, [separacao])
  const viraInvestimento = proLaboreMes * (separacao.pctInvestimentos / 100)

  // ── gráfico mestre ───────────────────────────────────────────────────────
  const serieMestre = useMemo(() => getDadosGraficoMestre(periodo), [getDadosGraficoMestre, periodo])

  // ── independência ────────────────────────────────────────────────────────
  const despPessoaisMensais = getDespesasPessoaisMensais()
  const independencia = getIndependenciaFinanceira()
  const projecao = getProjecaoIndependencia()
  const indCap = Math.min(100, independencia)
  const projTexto = projecao === 0 ? 'Você já vive de renda! 🎉'
    : !isFinite(projecao) ? 'Ajuste seus aportes para atingir a meta'
    : `Faltam ~${Math.floor(projecao / 12)}a ${Math.round(projecao % 12)}m`

  // ── fluxo consolidado do mês ─────────────────────────────────────────────
  const fluxo = getFluxoConsolidadoMes(mes)

  // ── objetivo principal ───────────────────────────────────────────────────
  const objPrincipal = objetivos.find(o => o.principal) ?? objetivos[0] ?? null
  const objData = useMemo(() => {
    if (!objPrincipal) return null
    return {
      alvo: patrimonioAlvo(objPrincipal),
      guardado: totalComRendimentos(objPrincipal, aportesReais),
      pct: progressoPercentual(objPrincipal, aportesReais),
      status: statusRitmo(objPrincipal, aportesReais),
      grafico: dadosGrafico(objPrincipal, aportesReais).slice(-20),
    }
  }, [objPrincipal, aportesReais])

  const Mask = (v: number) => maskSaldo(fmtBRL(v), ocultarSaldos)
  const MaskS = (v: number) => maskSaldo(fmtBRLshort(v), ocultarSaldos)

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#0a0f0a' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">

        {/* Header + filtro de visão */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
              <TrendingUp size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#e6edf3]">Dashboard</h1>
              <p className="text-xs text-[#8b949e]">Sua vida financeira completa, num só lugar</p>
            </div>
          </div>
          <button onClick={() => setOcultarSaldos(!ocultarSaldos)} className="p-2 rounded-lg bg-[#161b22] border border-[#21262d] text-[#8b949e] hover:text-[#e6edf3]">
            {ocultarSaldos ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Filtro de visão (abas) */}
        <div className="flex gap-1 bg-[#161b22] border border-[#21262d] rounded-xl p-1 self-start">
          {([
            { id: 'tudo' as Visao, label: 'Tudo' },
            { id: 'pessoal' as Visao, label: 'Só Pessoal' },
            { id: 'empresa' as Visao, label: 'Só Empresa' },
          ]).map(t => {
            const active = visao === t.id
            const cor = t.id === 'empresa' ? '#e8a020' : t.id === 'pessoal' ? '#1d9e75' : '#14b8a6'
            return (
              <button key={t.id} onClick={() => setVisao(t.id)}
                className="px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: active ? `${cor}22` : 'transparent', color: active ? cor : '#8b949e' }}>
                {t.label}
              </button>
            )
          })}
        </div>

        {/* B1 — Patrimônio + renda total */}
        <div className="rounded-2xl p-6 border relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d2b28, #0a1f1d)', borderColor: '#14b8a633' }}>
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-wider text-[#5eead4]">Patrimônio líquido total</p>
            <p className="text-4xl sm:text-5xl font-black text-white mt-2">{Mask(patAnim)}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <p className="text-sm text-[#8b949e]">Renda total mensal: <strong style={{ color: '#14b8a6' }}>{Mask(rendaTotal)}</strong></p>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: variacao >= 0 ? '#1d9e7522' : '#ef444422', color: variacao >= 0 ? '#1d9e75' : '#ef4444' }}>
                {variacao >= 0 ? '↑' : '↓'} {Math.abs(variacao).toFixed(1)}% no mês
              </span>
            </div>
          </div>
          {/* sparkline */}
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs><linearGradient id="spark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#14b8a6" stopOpacity={0.6} /><stop offset="100%" stopColor="#14b8a6" stopOpacity={0} /></linearGradient></defs>
                <Area type="monotone" dataKey="v" stroke="#14b8a6" strokeWidth={1.5} fill="url(#spark)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DESTAQUE — Alertas/Lembretes + Notas fixadas (prioridade visual) */}
        <PainelDestaque visao={visao} />

        {/* B2 + B3 — Blocos Pessoal / Empresa */}
        <div className={`grid grid-cols-1 ${visao === 'tudo' ? 'lg:grid-cols-2' : ''} gap-4`}>
          {/* PESSOAL */}
          {verPessoal && (
            <div className="rounded-2xl p-5 border" style={{ background: '#141a14', borderColor: '#1d9e7533' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1d9e7522' }}><User size={16} style={{ color: '#1d9e75' }} /></div>
                  <span className="text-sm font-semibold text-[#e6edf3]">Pessoal</span>
                </div>
                <button onClick={() => { setPerfilAtivo('pessoal'); setActiveView('contas') }} className="text-xs flex items-center gap-1" style={{ color: '#1d9e75' }}>ver detalhes <ArrowRight size={12} /></button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div><p className="text-[11px] text-[#8b949e]">Investido</p><p className="text-sm font-bold text-[#e6edf3]">{MaskS(simParams.inicial)}</p></div>
                <div><p className="text-[11px] text-[#8b949e]">Renda passiva</p><p className="text-sm font-bold" style={{ color: '#1d9e75' }}>{MaskS(rendaPassiva)}</p></div>
                <div><p className="text-[11px] text-[#8b949e]">Saldo contas</p><p className="text-sm font-bold text-[#e6edf3]">{MaskS(saldoPessoal)}</p></div>
                <div><p className="text-[11px] text-[#8b949e]">Poupança</p><p className="text-sm font-bold" style={{ color: taxaPoup >= 0 ? '#1d9e75' : '#ef4444' }}>{taxaPoup.toFixed(0)}%</p></div>
              </div>
              <div className="flex justify-between text-[11px] text-[#8b949e] mb-1">
                <span>Saldo do mês: <strong style={{ color: recPessoal - despPessoal >= 0 ? '#1d9e75' : '#ef4444' }}>{MaskS(recPessoal - despPessoal)}</strong></span>
                <span>Meta renda: {progMetaRenda.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#21262d] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${progMetaRenda}%`, background: 'linear-gradient(90deg,#1d9e75,#10b981)' }} />
              </div>
            </div>
          )}

          {/* EMPRESA */}
          {verEmpresa && (
            <div className="rounded-2xl p-5 border" style={{ background: '#141a14', borderColor: '#e8a02033' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#e8a02022' }}><Building2 size={16} style={{ color: '#e8a020' }} /></div>
                  <span className="text-sm font-semibold text-[#e6edf3]">Empresa</span>
                  <span className="text-xs" style={{ color: saudeEmpresa.cor }}>{saudeEmpresa.emoji} {saudeEmpresa.texto}</span>
                </div>
                <button onClick={() => { setPerfilAtivo('empresa'); setActiveView('empresa_dashboard') }} className="text-xs flex items-center gap-1" style={{ color: '#e8a020' }}>ver detalhes <ArrowRight size={12} /></button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div><p className="text-[11px] text-[#8b949e]">Faturamento</p><p className="text-sm font-bold text-[#e6edf3]">{MaskS(emp.fat)}</p></div>
                <div><p className="text-[11px] text-[#8b949e]">Lucro ({emp.margem.toFixed(0)}%)</p><p className="text-sm font-bold" style={{ color: '#e8a020' }}>{MaskS(emp.lucro)}</p></div>
                <div><p className="text-[11px] text-[#8b949e]">CMV</p><p className="text-sm font-bold" style={{ color: emp.cmvPct < 30 ? '#1d9e75' : emp.cmvPct <= 35 ? '#e8a020' : '#ef4444' }}>{emp.cmvPct.toFixed(0)}%</p></div>
                <div><p className="text-[11px] text-[#8b949e]">Caixa</p><p className="text-sm font-bold text-[#e6edf3]">{MaskS(emp.caixa)}</p></div>
              </div>
              {emp.aVencer7 > 0 && (
                <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: '#e8a02011', color: '#e8a020' }}>
                  <Clock size={13} /> {fmtBRL(emp.aVencer7)} a vencer nos próximos 7 dias
                </div>
              )}
            </div>
          )}
        </div>

        {/* B4 — Conexão (só em "tudo") */}
        {visao === 'tudo' && (
          <div className="rounded-2xl p-5 border" style={{ background: 'linear-gradient(135deg, #0d2b28, #141a14)', borderColor: '#14b8a633' }}>
            <div className="flex items-center gap-2 mb-4">
              <ArrowLeftRight size={16} style={{ color: '#14b8a6' }} />
              <span className="text-sm font-semibold text-[#e6edf3]">Como a empresa alimenta seus investimentos</span>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {[
                { label: 'Empresa', valor: emp.lucro, cor: '#e8a020', icon: Building2 },
                { label: 'Pró-labore', valor: proLaboreMes, cor: '#14b8a6', icon: Wallet },
                { label: 'Investimentos', valor: viraInvestimento, cor: '#1d9e75', icon: TrendingUp },
                { label: 'Renda passiva', valor: rendaPassiva, cor: '#22c55e', icon: Sparkles },
              ].map((step, i, arr) => {
                const Icon = step.icon
                return (
                  <div key={step.label} className="flex items-center gap-2 flex-1 min-w-[120px]">
                    <div className="flex-1 rounded-xl p-3 text-center" style={{ background: `${step.cor}15`, border: `1px solid ${step.cor}33` }}>
                      <Icon size={16} style={{ color: step.cor }} className="mx-auto mb-1" />
                      <p className="text-[10px] text-[#8b949e]">{step.label}</p>
                      <p className="text-xs font-bold" style={{ color: step.cor }}>{MaskS(step.valor)}</p>
                    </div>
                    {i < arr.length - 1 && <ArrowRight size={14} className="text-[#484f58] shrink-0" />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* B5 — Gráfico mestre */}
        <div className="rounded-2xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[#e6edf3]">Geração de caixa</p>
            <div className="flex gap-1">
              {([6, 12, 24] as const).map(p => (
                <button key={p} onClick={() => setPeriodo(p)}
                  className="px-2 py-1 rounded text-xs font-medium transition-colors"
                  style={{ background: periodo === p ? '#14b8a622' : 'transparent', color: periodo === p ? '#14b8a6' : '#8b949e' }}>
                  {p === 24 ? 'Tudo' : `${p}m`}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={serieMestre} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1d9e75" stopOpacity={0.5} /><stop offset="100%" stopColor="#1d9e75" stopOpacity={0} /></linearGradient>
                <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e8a020" stopOpacity={0.5} /><stop offset="100%" stopColor="#e8a020" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} interval={periodo > 12 ? 2 : 0} />
              <YAxis tickFormatter={v => fmtBRLshort(v)} tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={(v, n) => [fmtBRL(Number(v)), n === 'pessoal' ? 'Pessoal' : 'Empresa']} contentStyle={{ background: '#141a14', border: '1px solid #30363d', borderRadius: 8 }} />
              {verEmpresa && <Area type="monotone" dataKey="empresa" stackId="1" stroke="#e8a020" strokeWidth={2} fill="url(#gE)" />}
              {verPessoal && <Area type="monotone" dataKey="pessoal" stackId="1" stroke="#1d9e75" strokeWidth={2} fill="url(#gP)" />}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* B6 — Fluxo do mês consolidado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-1.5 mb-1"><TrendingUp size={13} className="text-[#1d9e75]" /><span className="text-[11px] text-[#8b949e]">Entradas do mês</span></div>
            <p className="text-lg font-bold text-[#1d9e75]">{Mask(fluxo.entradas)}</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-1.5 mb-1"><ArrowRight size={13} className="text-[#ef4444] rotate-90" /><span className="text-[11px] text-[#8b949e]">Saídas do mês</span></div>
            <p className="text-lg font-bold text-[#ef4444]">{Mask(fluxo.saidas)}</p>
          </div>
          <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <span className="text-[11px] text-[#8b949e]">Saldo consolidado</span>
            <p className="text-lg font-bold" style={{ color: fluxo.saldo >= 0 ? '#1d9e75' : '#ef4444' }}>{Mask(fluxo.saldo)}</p>
          </div>
        </div>

        {/* B7 — Independência financeira (pessoal) */}
        {verPessoal && (
          <div className="rounded-2xl p-6 border" style={{ background: '#141a14', borderColor: '#14b8a633' }}>
            <div className="flex items-center gap-2 mb-4">
              <Target size={18} style={{ color: '#14b8a6' }} />
              <span className="text-base font-semibold text-[#e6edf3]">Independência Financeira</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div><p className="text-xs text-[#8b949e]">Despesas/mês</p><p className="text-base sm:text-lg font-bold text-[#e6edf3]">{Mask(despPessoaisMensais)}</p></div>
              <div><p className="text-xs text-[#8b949e]">Renda passiva</p><p className="text-base sm:text-lg font-bold" style={{ color: '#14b8a6' }}>{Mask(rendaPassiva)}</p></div>
              <div><p className="text-xs text-[#8b949e]">Independência</p><p className="text-base sm:text-lg font-bold" style={{ color: '#14b8a6' }}>{independencia.toFixed(0)}%</p></div>
            </div>
            <div className="h-3 rounded-full bg-[#21262d] overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${indCap}%`, background: 'linear-gradient(90deg, #14b8a6, #22c55e)' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: '#14b8a6' }}>Você está a {independencia.toFixed(0)}% de viver de renda</p>
            <p className="text-xs text-[#8b949e] mt-1">{projTexto}</p>
          </div>
        )}

        {/* B8 — Acompanhamento do objetivo */}
        {verPessoal && objPrincipal && objData && (
          <button onClick={() => setActiveView('simulador')}
            className="w-full text-left rounded-2xl p-5 border hover:border-[#1d9e75] transition-colors" style={{ background: '#141a14', borderColor: '#1d9e7533' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1d9e7522' }}><PiggyBank size={16} style={{ color: '#1d9e75' }} /></div>
                <div>
                  <p className="text-sm font-semibold text-[#e6edf3]">{objPrincipal.nome}</p>
                  <p className="text-xs" style={{ color: objData.status.cor === 'verde' ? '#1d9e75' : objData.status.cor === 'amarelo' ? '#e8a020' : '#ef4444' }}>{objData.status.emoji} {objData.status.texto}</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-[#8b949e]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="sm:col-span-2">
                <div className="h-2.5 rounded-full bg-[#21262d] overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, objData.pct)}%`, background: 'linear-gradient(90deg, #1d9e75, #10b981)' }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold" style={{ color: '#1d9e75' }}>{Mask(objData.guardado)} ({objData.pct.toFixed(0)}%)</span>
                  <span className="text-[#8b949e]">Meta: {isFinite(objData.alvo) ? Mask(objData.alvo) : '∞'}</span>
                </div>
              </div>
              {/* mini gráfico real vs planejado */}
              <div className="h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={objData.grafico}>
                    <Line type="monotone" dataKey="real" stroke="#1d9e75" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="planejado" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </button>
        )}

      </div>
    </div>
  )
}
