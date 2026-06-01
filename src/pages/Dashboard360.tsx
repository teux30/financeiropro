import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  User, Building2, ArrowRight, TrendingUp, Target, Sparkles, Wallet, ArrowLeftRight,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { fmtBRL, fmtBRLshort, maskSaldo, MESES_CURTO } from '../lib/format'
import { useCountUp } from '../lib/banco-ui'

export function Dashboard360() {
  const {
    setActiveView, setPerfilAtivo, ocultarSaldos,
    getPatrimonioTotal, getRendaMensalTotal,
    getRendaPassivaMensal, getDespesasPessoaisMensais, getIndependenciaFinanceira,
    getProjecaoIndependencia, getSaldoTotal, getReceitasMes, getDespesasMes,
    simParams, separacao,
  } = useStore()

  const patrimonioTotal = getPatrimonioTotal()
  const rendaTotal = getRendaMensalTotal()
  const rendaPassiva = getRendaPassivaMensal()
  const despesasPessoais = getDespesasPessoaisMensais()
  const independencia = getIndependenciaFinanceira()
  const projecao = getProjecaoIndependencia()
  const saldoPessoal = getSaldoTotal('pessoal')
  const mes = new Date().toISOString().slice(0, 7)

  const patrimonioAnim = useCountUp(patrimonioTotal)

  // empresa: faturamento e lucro do mês
  const { fatEmpresa, lucroEmpresa, saldoEmpresaCaixa } = useMemo(() => {
    const fat = getReceitasMes(mes, 'empresa')
    const desp = getDespesasMes(mes, 'empresa')
    return { fatEmpresa: fat, lucroEmpresa: Math.max(0, fat - desp), saldoEmpresaCaixa: getSaldoTotal('empresa') }
  }, [getReceitasMes, getDespesasMes, getSaldoTotal, mes])

  // pró-labore do mês e quanto virou investimento
  const proLaboreMes = useMemo(() => {
    const ano = new Date().getFullYear(), m = new Date().getMonth() + 1
    return separacao.historico.filter(h => h.ano === ano && h.mes === m).reduce((s, h) => s + h.valor, 0) || separacao.proLabore
  }, [separacao])
  const viraInvestimento = proLaboreMes * (separacao.pctInvestimentos / 100)

  // gráfico mestre 12 meses (área empilhada pessoal + empresa)
  const serie12m = useMemo(() => {
    const arr: { label: string; pessoal: number; empresa: number; total: number }[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const pSaldo = getReceitasMes(key, 'pessoal') - getDespesasMes(key, 'pessoal')
      const eSaldo = getReceitasMes(key, 'empresa') - getDespesasMes(key, 'empresa')
      const pessoal = Math.max(0, pSaldo)
      const empresa = Math.max(0, eSaldo)
      arr.push({ label: MESES_CURTO[d.getMonth()], pessoal, empresa, total: pessoal + empresa })
    }
    return arr
  }, [getReceitasMes, getDespesasMes])

  const independenciaCapped = Math.min(100, independencia)
  const projecaoTexto = projecao === 0 ? 'Você já vive de renda! 🎉'
    : !isFinite(projecao) ? 'Ajuste seus aportes para atingir a meta'
    : `Faltam ~${Math.floor(projecao / 12)} anos e ${projecao % 12} meses`

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#0a0f0a' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#e6edf3]">Visão Geral 360°</h1>
            <p className="text-xs text-[#8b949e]">Sua vida financeira completa, conectada</p>
          </div>
        </div>

        {/* Patrimônio líquido total */}
        <div className="rounded-2xl p-6 border text-center" style={{ background: 'linear-gradient(135deg, #0d2b28, #0a1f1d)', borderColor: '#14b8a633' }}>
          <p className="text-xs uppercase tracking-wider text-[#5eead4]">Patrimônio líquido total</p>
          <p className="text-4xl sm:text-5xl font-black text-white mt-2">{maskSaldo(fmtBRL(patrimonioAnim), ocultarSaldos)}</p>
          <p className="text-sm text-[#8b949e] mt-2">Renda total mensal: <strong style={{ color: '#14b8a6' }}>{maskSaldo(fmtBRL(rendaTotal), ocultarSaldos)}</strong></p>
        </div>

        {/* Blocos Pessoal + Empresa */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pessoal */}
          <div className="rounded-2xl p-5 border" style={{ background: '#141a14', borderColor: '#1d9e7533' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1d9e7522' }}><User size={16} style={{ color: '#1d9e75' }} /></div>
                <span className="text-sm font-semibold text-[#e6edf3]">Pessoal</span>
              </div>
              <button onClick={() => { setPerfilAtivo('pessoal'); setActiveView('dashboard') }} className="text-xs flex items-center gap-1" style={{ color: '#1d9e75' }}>ver detalhes <ArrowRight size={12} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><p className="text-[11px] text-[#8b949e]">Investido</p><p className="text-sm font-bold text-[#e6edf3]">{maskSaldo(fmtBRLshort(simParams.inicial), ocultarSaldos)}</p></div>
              <div><p className="text-[11px] text-[#8b949e]">Renda passiva</p><p className="text-sm font-bold" style={{ color: '#1d9e75' }}>{maskSaldo(fmtBRLshort(rendaPassiva), ocultarSaldos)}</p></div>
              <div><p className="text-[11px] text-[#8b949e]">Saldo contas</p><p className="text-sm font-bold text-[#e6edf3]">{maskSaldo(fmtBRLshort(saldoPessoal), ocultarSaldos)}</p></div>
            </div>
          </div>

          {/* Empresa */}
          <div className="rounded-2xl p-5 border" style={{ background: '#141a14', borderColor: '#e8a02033' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#e8a02022' }}><Building2 size={16} style={{ color: '#e8a020' }} /></div>
                <span className="text-sm font-semibold text-[#e6edf3]">Empresa</span>
              </div>
              <button onClick={() => { setPerfilAtivo('empresa'); setActiveView('empresa_dashboard') }} className="text-xs flex items-center gap-1" style={{ color: '#e8a020' }}>ver detalhes <ArrowRight size={12} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><p className="text-[11px] text-[#8b949e]">Faturamento</p><p className="text-sm font-bold text-[#e6edf3]">{maskSaldo(fmtBRLshort(fatEmpresa), ocultarSaldos)}</p></div>
              <div><p className="text-[11px] text-[#8b949e]">Lucro líq.</p><p className="text-sm font-bold" style={{ color: '#e8a020' }}>{maskSaldo(fmtBRLshort(lucroEmpresa), ocultarSaldos)}</p></div>
              <div><p className="text-[11px] text-[#8b949e]">Caixa</p><p className="text-sm font-bold text-[#e6edf3]">{maskSaldo(fmtBRLshort(saldoEmpresaCaixa), ocultarSaldos)}</p></div>
            </div>
          </div>
        </div>

        {/* Bloco conexão */}
        <div className="rounded-2xl p-5 border" style={{ background: 'linear-gradient(135deg, #0d2b28, #141a14)', borderColor: '#14b8a633' }}>
          <div className="flex items-center gap-2 mb-4">
            <ArrowLeftRight size={16} style={{ color: '#14b8a6' }} />
            <span className="text-sm font-semibold text-[#e6edf3]">Como a empresa alimenta seus investimentos</span>
          </div>
          {/* fluxo visual */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {[
              { label: 'Empresa', valor: lucroEmpresa, cor: '#e8a020', icon: Building2 },
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
                    <p className="text-xs font-bold" style={{ color: step.cor }}>{maskSaldo(fmtBRLshort(step.valor), ocultarSaldos)}</p>
                  </div>
                  {i < arr.length - 1 && <ArrowRight size={14} className="text-[#484f58] shrink-0" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Gráfico mestre 12m */}
        <div className="rounded-2xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-semibold text-[#e6edf3] mb-3">Geração de caixa — 12 meses</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={serie12m} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1d9e75" stopOpacity={0.5} /><stop offset="100%" stopColor="#1d9e75" stopOpacity={0} /></linearGradient>
                <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e8a020" stopOpacity={0.5} /><stop offset="100%" stopColor="#e8a020" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmtBRLshort(v)} tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={(v, n) => [fmtBRL(Number(v)), n === 'pessoal' ? 'Pessoal' : 'Empresa']} contentStyle={{ background: '#141a14', border: '1px solid #30363d', borderRadius: 8 }} />
              <Area type="monotone" dataKey="empresa" stackId="1" stroke="#e8a020" strokeWidth={2} fill="url(#gE)" />
              <Area type="monotone" dataKey="pessoal" stackId="1" stroke="#1d9e75" strokeWidth={2} fill="url(#gP)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Independência financeira */}
        <div className="rounded-2xl p-6 border" style={{ background: '#141a14', borderColor: '#14b8a633' }}>
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} style={{ color: '#14b8a6' }} />
            <span className="text-base font-semibold text-[#e6edf3]">Independência Financeira</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <div><p className="text-xs text-[#8b949e]">Despesas mensais</p><p className="text-lg font-bold text-[#e6edf3]">{maskSaldo(fmtBRL(despesasPessoais), ocultarSaldos)}</p></div>
            <div><p className="text-xs text-[#8b949e]">Renda passiva</p><p className="text-lg font-bold" style={{ color: '#14b8a6' }}>{maskSaldo(fmtBRL(rendaPassiva), ocultarSaldos)}</p></div>
            <div><p className="text-xs text-[#8b949e]">Independência</p><p className="text-lg font-bold" style={{ color: '#14b8a6' }}>{independencia.toFixed(0)}%</p></div>
          </div>
          <div className="h-3 rounded-full bg-[#21262d] overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${independenciaCapped}%`, background: 'linear-gradient(90deg, #14b8a6, #22c55e)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: '#14b8a6' }}>
            Você está a {independencia.toFixed(0)}% de viver de renda
          </p>
          <p className="text-xs text-[#8b949e] mt-1">{projecaoTexto}</p>
        </div>
      </div>
    </div>
  )
}
