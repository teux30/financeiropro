import { useState } from 'react'
import { ArrowLeftRight, DollarSign, PieChart, BarChart2, AlertTriangle, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useStore } from '../store/useStore'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const TABS = [
  { label: 'Pró-Labore', icon: DollarSign },
  { label: 'Destino', icon: PieChart },
  { label: 'Visão Consolidada', icon: BarChart2 },
]

export function SeparacaoPage() {
  const { separacao, setSeparacao, registrarProLabore, simParams, getEmpresaAtiva } = useStore()
  const empresa = getEmpresaAtiva()

  const [activeTab, setActiveTab] = useState(0)
  const [proLaboreInput, setProLaboreInput] = useState(String(separacao.proLabore))
  const [showRegModal, setShowRegModal] = useState(false)
  const [obsInput, setObsInput] = useState('')

  const [pctInv, setPctInv] = useState(separacao.pctInvestimentos)
  const [pctDesp, setPctDesp] = useState(separacao.pctDespesas)
  const [pctRes, setPctRes] = useState(separacao.pctReserva)
  const totalPct = pctInv + pctDesp + pctRes

  // Faturamento this month from empresa
  const now = new Date()
  const mesStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const faturamentoMes = empresa
    ? empresa.fluxoCaixa.filter(l => l.tipo === 'entrada' && l.data.startsWith(mesStr)).reduce((s, l) => s + l.valor, 0)
    : 0
  const pctFaturamento = faturamentoMes > 0 ? (separacao.proLabore / faturamentoMes * 100) : 0

  // Histórico chart
  const now2 = new Date()
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now2.getFullYear(), now2.getMonth() - 5 + i, 1)
    const m = d.getMonth() + 1, a = d.getFullYear()
    const totalMes = separacao.historico.filter(h => h.mes === m && h.ano === a).reduce((s, h) => s + h.valor, 0)
    return { label: MESES[m - 1], valor: totalMes }
  })

  // Consolidado
  const patrimonioPessoal = simParams.inicial
  const estoqueEmpresa = empresa ? empresa.insumos.reduce((s, i) => s + i.estoqueAtual * i.custoUnitario, 0) : 0
  const totalAnoAtual = separacao.historico.filter(h => h.ano === now.getFullYear()).reduce((s, h) => s + h.valor, 0)

  const handleRegistrar = () => {
    registrarProLabore(separacao.proLabore, obsInput)
    setObsInput('')
    setShowRegModal(false)
  }

  const saveDestino = () => {
    setSeparacao({ pctInvestimentos: pctInv, pctDespesas: pctDesp, pctReserva: pctRes })
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d1117]">
      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#1d9e7522' }}>
            <ArrowLeftRight size={18} style={{ color: '#1d9e75' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#e6edf3]">Separação Financeira</h1>
            <p className="text-xs text-[#8b949e]">Pessoal vs Empresa</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
          {TABS.map((tab, i) => {
            const Icon = tab.icon
            return (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
                style={{
                  background: activeTab === i ? '#1d9e7522' : 'transparent',
                  color: activeTab === i ? '#1d9e75' : '#8b949e',
                  borderBottom: activeTab === i ? '2px solid #1d9e75' : '2px solid transparent',
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* TAB 0 — Pró-Labore */}
        {activeTab === 0 && (
          <div className="flex flex-col gap-5">
            {/* Large card */}
            <div className="bg-[#161b22] border border-[#1d9e7544] rounded-2xl p-6">
              <p className="text-xs text-[#8b949e] uppercase tracking-wider mb-3">Pró-labore mensal</p>
              <div className="flex items-end gap-4 mb-4">
                <span className="text-4xl font-black text-[#1d9e75]">{fmtBRL(separacao.proLabore)}</span>
                <span className="text-[#8b949e] mb-1">/mês</span>
              </div>
              <div className="flex gap-3 flex-wrap">
                <div className="flex gap-2">
                  <Input
                    placeholder="Novo valor (R$)"
                    type="number"
                    value={proLaboreInput}
                    onChange={e => setProLaboreInput(e.target.value)}
                    className="w-40"
                  />
                  <Button onClick={() => setSeparacao({ proLabore: Number(proLaboreInput) || 0 })} style={{ background: '#1d9e75' } as React.CSSProperties} className="text-white">
                    Atualizar
                  </Button>
                </div>
                <Button variant="secondary" onClick={() => setShowRegModal(true)}>
                  Registrar retirada do mês
                </Button>
              </div>
            </div>

            {/* Alerts */}
            {faturamentoMes > 0 && (
              <div className="flex items-center gap-2 p-3 bg-[#f59e0b11] border border-[#f59e0b33] rounded-xl text-sm">
                <AlertTriangle size={15} style={{ color: '#f59e0b' }} />
                <span style={{ color: '#f59e0b' }}>
                  Seu pró-labore representa <strong>{pctFaturamento.toFixed(1)}%</strong> do faturamento do mês.
                </span>
              </div>
            )}

            {/* Chart */}
            {chartData.some(d => d.valor > 0) && (
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[#e6edf3] mb-4">Histórico de retiradas (6 meses)</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`} tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [fmtBRL(Number(v)), 'Pró-labore']} contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} labelStyle={{ color: '#e6edf3' }} />
                    <Bar dataKey="valor" fill="#1d9e75" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Histórico table */}
            {separacao.historico.length > 0 && (
              <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#21262d]">
                      {['Mês', 'Ano', 'Valor', 'Observação'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8b949e]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...separacao.historico].reverse().map(h => (
                      <tr key={h.id} className="border-b border-[#21262d] last:border-0 hover:bg-[#1c2128]">
                        <td className="px-4 py-2.5 text-[#e6edf3]">{MESES[h.mes - 1]}</td>
                        <td className="px-4 py-2.5 text-[#8b949e]">{h.ano}</td>
                        <td className="px-4 py-2.5 font-semibold text-[#1d9e75]">{fmtBRL(h.valor)}</td>
                        <td className="px-4 py-2.5 text-[#8b949e]">{h.observacao || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 1 — Destino */}
        {activeTab === 1 && (
          <div className="flex flex-col gap-5">
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6 flex flex-col gap-5">
              <h2 className="text-base font-semibold text-[#e6edf3]">Como distribuir o pró-labore</h2>

              {totalPct !== 100 && (
                <div className="flex items-center gap-2 p-3 bg-[#f59e0b11] border border-[#f59e0b33] rounded-xl text-xs" style={{ color: '#f59e0b' }}>
                  <AlertTriangle size={13} />
                  A soma deve ser 100% (atual: {totalPct}%)
                </div>
              )}

              {[
                { label: 'Investimentos', value: pctInv, setValue: setPctInv, color: '#1d9e75' },
                { label: 'Despesas pessoais', value: pctDesp, setValue: setPctDesp, color: '#3b82f6' },
                { label: 'Reserva de emergência', value: pctRes, setValue: setPctRes, color: '#e8a020' },
              ].map(item => (
                <div key={item.label} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#e6edf3]">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8b949e]">
                        {separacao.proLabore > 0 ? fmtBRL(separacao.proLabore * item.value / 100) : ''}
                      </span>
                      <input
                        type="number"
                        min={0} max={100}
                        value={item.value}
                        onChange={e => item.setValue(Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="w-16 bg-[#0d1117] border border-[#30363d] rounded px-2 py-0.5 text-sm text-right text-[#e6edf3] focus:outline-none focus:border-[#1d9e75]"
                      />
                      <span className="text-sm text-[#8b949e]">%</span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-[#21262d] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color, transition: 'width 200ms' }} />
                    <input type="range" min={0} max={100} value={item.value} onChange={e => item.setValue(Number(e.target.value))}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer" />
                  </div>
                </div>
              ))}

              <Button onClick={saveDestino} style={{ background: '#1d9e75' } as React.CSSProperties} className="text-white self-start">
                Salvar distribuição
              </Button>
            </div>

            {separacao.proLabore > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Investimentos', value: separacao.proLabore * pctInv / 100, color: '#1d9e75' },
                  { label: 'Despesas', value: separacao.proLabore * pctDesp / 100, color: '#3b82f6' },
                  { label: 'Reserva', value: separacao.proLabore * pctRes / 100, color: '#e8a020' },
                ].map(k => (
                  <div key={k.label} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 text-center">
                    <p className="text-xs text-[#8b949e] mb-1">{k.label}</p>
                    <p className="text-xl font-bold" style={{ color: k.color }}>{fmtBRL(k.value)}</p>
                    <p className="text-xs text-[#484f58]">por mês</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2 — Consolidado */}
        {activeTab === 2 && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[#0d2b1e] to-[#0d1f2b] border border-[#1d9e7533] rounded-xl p-5">
                <p className="text-xs text-[#8b949e] flex items-center gap-1.5 mb-2">
                  <TrendingUp size={12} /> Patrimônio Pessoal
                </p>
                <p className="text-3xl font-black text-[#1d9e75]">{fmtBRL(patrimonioPessoal)}</p>
                <p className="text-xs text-[#484f58] mt-1">Investimentos cadastrados</p>
              </div>
              <div className="bg-gradient-to-br from-[#2b1d0d] to-[#1f2b0d] border border-[#e8a02033] rounded-xl p-5">
                <p className="text-xs text-[#8b949e] flex items-center gap-1.5 mb-2">
                  <BarChart2 size={12} /> Patrimônio Empresa
                </p>
                <p className="text-3xl font-black text-[#e8a020]">{fmtBRL(estoqueEmpresa)}</p>
                <p className="text-xs text-[#484f58] mt-1">Valor do estoque estimado</p>
              </div>
            </div>

            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
              <p className="text-xs text-[#8b949e] mb-1">Patrimônio total consolidado</p>
              <p className="text-4xl font-black text-[#e6edf3]">{fmtBRL(patrimonioPessoal + estoqueEmpresa)}</p>
            </div>

            <div className="p-4 bg-[#1d9e7511] border border-[#1d9e7533] rounded-xl">
              <p className="text-sm text-[#1d9e75] font-semibold">
                💚 Este ano você retirou <strong>{fmtBRL(totalAnoAtual)}</strong> em pró-labore
              </p>
              <p className="text-xs text-[#8b949e] mt-1">
                Com a distribuição atual, <strong>{fmtBRL(totalAnoAtual * pctInv / 100)}</strong> foram direcionados para investimentos.
              </p>
            </div>

            <div className="p-4 bg-[#161b22] border border-[#21262d] rounded-xl text-sm text-[#8b949e] italic">
              📊 Os dados detalhados da carteira de investimentos estarão disponíveis em breve.
            </div>
          </div>
        )}
      </div>

      {/* Register modal */}
      <Modal open={showRegModal} onClose={() => setShowRegModal(false)} title="Registrar retirada">
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
            <p className="text-sm text-[#8b949e]">Valor: <strong className="text-[#1d9e75]">{fmtBRL(separacao.proLabore)}</strong></p>
            <p className="text-xs text-[#484f58] mt-0.5">Mês atual: {MESES[now.getMonth()]} {now.getFullYear()}</p>
          </div>
          <Input label="Observação (opcional)" value={obsInput} onChange={e => setObsInput(e.target.value)} placeholder="Ex: Retirada de dezembro" autoFocus />
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setShowRegModal(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleRegistrar} className="flex-1 text-white" style={{ background: '#1d9e75' } as React.CSSProperties}>
              Confirmar retirada
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
