import { useMemo, useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  User, ArrowRight, TrendingUp, Target, Wallet, Eye, EyeOff, PiggyBank,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { PainelDestaque } from '../components/dashboard/PainelDestaque'
import { fmtBRL, fmtBRLshort, maskSaldo } from '../lib/format'
import { useCountUp } from '../lib/banco-ui'
import { patrimonioAlvo } from '../store/objetivoTypes'
import {
  totalComRendimentos, progressoPercentual, statusRitmo, dadosGrafico,
} from '../store/objetivoSelectors'

const hojeMes = () => new Date().toISOString().slice(0, 7)
const ACCENT = '#1d9e75'

export function Dashboard() {
  const s = useStore()
  const {
    setActiveView, ocultarSaldos, setOcultarSaldos,
    getRendaPassivaMensal, getDespesasPessoaisMensais, getIndependenciaFinanceira,
    getProjecaoIndependencia, getSaldoTotal, getReceitasMes, getDespesasMes, getTaxaPoupanca,
    getDadosGraficoMestre, simParams, objetivos, aportesReais,
  } = s

  const [periodo, setPeriodo] = useState<6 | 12 | 24>(12)
  const mes = hojeMes()

  // ── Pessoal ────────────────────────────────────────────────────────────────
  const saldoPessoal = getSaldoTotal('pessoal')
  const investido = simParams.inicial
  const patrimonio = saldoPessoal + investido
  const patAnim = useCountUp(patrimonio)
  const rendaPassiva = getRendaPassivaMensal()
  const recPessoal = getReceitasMes(mes, 'pessoal')
  const despPessoal = getDespesasMes(mes, 'pessoal')
  const taxaPoup = getTaxaPoupanca(mes, 'pessoal')
  const sobra = recPessoal - despPessoal
  const metaRenda = simParams.meta
  const progMetaRenda = metaRenda > 0 ? Math.min(100, (rendaPassiva / metaRenda) * 100) : 0

  // ── Independência ────────────────────────────────────────────────────────
  const despPessoaisMensais = getDespesasPessoaisMensais()
  const independencia = getIndependenciaFinanceira()
  const projecao = getProjecaoIndependencia()
  const indCap = Math.min(100, independencia)
  const projTexto = projecao === 0 ? 'Você já vive de renda! 🎉'
    : !isFinite(projecao) ? 'Ajuste seus aportes para atingir a meta'
    : `Faltam ~${Math.floor(projecao / 12)}a ${Math.round(projecao % 12)}m`

  // ── Objetivo ───────────────────────────────────────────────────────────────
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

  // ── Gráfico (apenas pessoal) ─────────────────────────────────────────────
  const serie = useMemo(() => getDadosGraficoMestre(periodo), [getDadosGraficoMestre, periodo])
  const sparkData = useMemo(() => getDadosGraficoMestre(12).map(d => ({ v: d.pessoal })), [getDadosGraficoMestre])

  const Mask = (v: number) => maskSaldo(fmtBRL(v), ocultarSaldos)
  const MaskS = (v: number) => maskSaldo(fmtBRLshort(v), ocultarSaldos)

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#0a0f0a' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${ACCENT}22` }}>
              <User size={18} style={{ color: ACCENT }} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#e6edf3]">Dashboard Pessoal</h1>
              <p className="text-xs text-[#8b949e]">Suas finanças pessoais</p>
            </div>
          </div>
          <button onClick={() => setOcultarSaldos(!ocultarSaldos)} className="p-2 rounded-lg bg-[#161b22] border border-[#21262d] text-[#8b949e] hover:text-[#e6edf3]">
            {ocultarSaldos ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Patrimônio pessoal */}
        <div className="rounded-2xl p-6 border relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d2b22, #0a1f19)', borderColor: `${ACCENT}33` }}>
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-wider" style={{ color: '#5eeaa4' }}>Patrimônio pessoal</p>
            <p className="text-4xl sm:text-5xl font-black text-white mt-2">{Mask(patAnim)}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <p className="text-sm text-[#8b949e]">Renda passiva mensal: <strong style={{ color: ACCENT }}>{Mask(rendaPassiva)}</strong></p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs><linearGradient id="spark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACCENT} stopOpacity={0.6} /><stop offset="100%" stopColor={ACCENT} stopOpacity={0} /></linearGradient></defs>
                <Area type="monotone" dataKey="v" stroke={ACCENT} strokeWidth={1.5} fill="url(#spark)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Destaque — alertas/lembretes + notas (pessoal) */}
        <PainelDestaque visao="pessoal" />

        {/* Resumo pessoal */}
        <div className="rounded-2xl p-5 border" style={{ background: '#141a14', borderColor: `${ACCENT}33` }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-[#e6edf3]">Resumo do mês</span>
            <button onClick={() => setActiveView('contas')} className="text-xs flex items-center gap-1" style={{ color: ACCENT }}>ver contas <ArrowRight size={12} /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div><p className="text-[11px] text-[#8b949e]">Saldo em contas</p><p className="text-sm font-bold text-[#e6edf3]">{MaskS(saldoPessoal)}</p></div>
            <div><p className="text-[11px] text-[#8b949e]">Investido</p><p className="text-sm font-bold text-[#e6edf3]">{MaskS(investido)}</p></div>
            <div><p className="text-[11px] text-[#8b949e]">Renda passiva</p><p className="text-sm font-bold" style={{ color: ACCENT }}>{MaskS(rendaPassiva)}</p></div>
            <div><p className="text-[11px] text-[#8b949e]">Poupança</p><p className="text-sm font-bold" style={{ color: taxaPoup >= 0 ? ACCENT : '#ef4444' }}>{taxaPoup.toFixed(0)}%</p></div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div><p className="text-[11px] text-[#8b949e]">Receitas</p><p className="text-sm font-bold text-[#1d9e75]">{MaskS(recPessoal)}</p></div>
            <div><p className="text-[11px] text-[#8b949e]">Despesas</p><p className="text-sm font-bold text-[#ef4444]">{MaskS(despPessoal)}</p></div>
            <div><p className="text-[11px] text-[#8b949e]">Sobra p/ investir</p><p className="text-sm font-bold" style={{ color: sobra >= 0 ? ACCENT : '#ef4444' }}>{MaskS(sobra)}</p></div>
          </div>
          <div className="flex justify-between text-[11px] text-[#8b949e] mb-1"><span>Meta de renda passiva</span><span>{progMetaRenda.toFixed(0)}%</span></div>
          <div className="h-2 rounded-full bg-[#21262d] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${progMetaRenda}%`, background: 'linear-gradient(90deg,#1d9e75,#10b981)' }} />
          </div>
        </div>

        {/* Gráfico pessoal */}
        <div className="rounded-2xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[#e6edf3]">Geração de caixa pessoal</p>
            <div className="flex gap-1">
              {([6, 12, 24] as const).map(p => (
                <button key={p} onClick={() => setPeriodo(p)} className="px-2 py-1 rounded text-xs font-medium transition-colors"
                  style={{ background: periodo === p ? `${ACCENT}22` : 'transparent', color: periodo === p ? ACCENT : '#8b949e' }}>
                  {p === 24 ? 'Tudo' : `${p}m`}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={serie} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACCENT} stopOpacity={0.5} /><stop offset="100%" stopColor={ACCENT} stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} interval={periodo > 12 ? 2 : 0} />
              <YAxis tickFormatter={v => fmtBRLshort(v)} tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={(v) => [fmtBRL(Number(v)), 'Pessoal']} contentStyle={{ background: '#141a14', border: '1px solid #30363d', borderRadius: 8 }} />
              <Area type="monotone" dataKey="pessoal" stroke={ACCENT} strokeWidth={2} fill="url(#gP)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Independência financeira */}
        <div className="rounded-2xl p-6 border" style={{ background: '#141a14', borderColor: `${ACCENT}33` }}>
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} style={{ color: ACCENT }} />
            <span className="text-base font-semibold text-[#e6edf3]">Independência Financeira</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><p className="text-xs text-[#8b949e]">Despesas/mês</p><p className="text-base sm:text-lg font-bold text-[#e6edf3]">{Mask(despPessoaisMensais)}</p></div>
            <div><p className="text-xs text-[#8b949e]">Renda passiva</p><p className="text-base sm:text-lg font-bold" style={{ color: ACCENT }}>{Mask(rendaPassiva)}</p></div>
            <div><p className="text-xs text-[#8b949e]">Independência</p><p className="text-base sm:text-lg font-bold" style={{ color: ACCENT }}>{independencia.toFixed(0)}%</p></div>
          </div>
          <div className="h-3 rounded-full bg-[#21262d] overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${indCap}%`, background: 'linear-gradient(90deg, #14b8a6, #22c55e)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: ACCENT }}>Você está a {independencia.toFixed(0)}% de viver de renda</p>
          <p className="text-xs text-[#8b949e] mt-1">{projTexto}</p>
        </div>

        {/* Objetivo */}
        {objPrincipal && objData && (
          <button onClick={() => setActiveView('simulador')}
            className="w-full text-left rounded-2xl p-5 border hover:border-[#1d9e75] transition-colors" style={{ background: '#141a14', borderColor: `${ACCENT}33` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${ACCENT}22` }}><PiggyBank size={16} style={{ color: ACCENT }} /></div>
                <div>
                  <p className="text-sm font-semibold text-[#e6edf3]">{objPrincipal.nome}</p>
                  <p className="text-xs" style={{ color: objData.status.cor === 'verde' ? ACCENT : objData.status.cor === 'amarelo' ? '#e8a020' : '#ef4444' }}>{objData.status.emoji} {objData.status.texto}</p>
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
                  <span className="font-semibold" style={{ color: ACCENT }}>{Mask(objData.guardado)} ({objData.pct.toFixed(0)}%)</span>
                  <span className="text-[#8b949e]">Meta: {isFinite(objData.alvo) ? Mask(objData.alvo) : '∞'}</span>
                </div>
              </div>
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

        {/* Atalho investimentos */}
        <button onClick={() => setActiveView('simulador')} className="rounded-2xl p-4 border flex items-center gap-3 hover:border-[#1d9e75] transition-colors" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${ACCENT}22` }}><TrendingUp size={16} style={{ color: ACCENT }} /></div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-[#e6edf3]">Simulador de investimentos</p>
            <p className="text-xs text-[#8b949e]">Projete sua renda passiva e aportes</p>
          </div>
          <ArrowRight size={16} className="text-[#8b949e]" />
        </button>

        <div className="flex items-center gap-2 text-[11px] text-[#484f58] justify-center pt-2">
          <Wallet size={12} /> Dashboard exclusivo do perfil Pessoal — troque de perfil para ver a Empresa.
        </div>
      </div>
    </div>
  )
}
