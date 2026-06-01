import { useMemo } from 'react'
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useStore } from '../../store/useStore'
import { CategoriaIcon } from '../../lib/banco-ui'
import { fmtBRL, fmtBRLshort, fmtData, labelDia, maskSaldo } from '../../lib/format'

export function ContaDetalhe() {
  const {
    getBanco, getSaldoConta, activeContaId,
    setActiveView, ocultarSaldos,
  } = useStore()
  const banco = getBanco()
  const conta = banco.contas.find(c => c.id === activeContaId)

  const txs = useMemo(() =>
    banco.transacoes.filter(t => t.contaId === activeContaId).sort((a, b) => b.data.localeCompare(a.data)),
    [banco.transacoes, activeContaId])

  // evolução 30 dias
  const chartData = useMemo(() => {
    if (!conta) return []
    const dias: { label: string; saldo: number }[] = []
    const ordenadas = [...banco.transacoes.filter(t => t.contaId === conta.id)].sort((a, b) => a.data.localeCompare(b.data))
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const cutoff = d.toISOString().slice(0, 10)
      const delta = ordenadas.filter(t => t.data.slice(0, 10) <= cutoff)
        .reduce((s, t) => s + (t.tipo === 'entrada' ? t.valor : -t.valor), 0)
      dias.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, saldo: conta.saldoInicial + delta })
    }
    return dias
  }, [banco.transacoes, conta])

  if (!conta) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0f0a]">
        <button onClick={() => setActiveView('contas')} className="text-[#8b949e]">← Voltar para contas</button>
      </div>
    )
  }

  const saldo = getSaldoConta(conta.id)
  const grupos = (() => {
    const m = new Map<string, typeof txs>()
    txs.forEach(t => { const k = t.data.slice(0, 10); if (!m.has(k)) m.set(k, []); m.get(k)!.push(t) })
    return Array.from(m.entries())
  })()

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#0a0f0a' }}>
      {/* Header com cor da conta */}
      <div className="px-4 sm:px-6 py-6" style={{ background: `linear-gradient(135deg, ${conta.cor}, ${conta.cor}aa)` }}>
        <div className="max-w-3xl mx-auto">
          <button onClick={() => setActiveView('contas')} className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-4">
            <ArrowLeft size={16} /> Contas
          </button>
          <p className="text-white/80 text-sm">{conta.nome} · {conta.banco}</p>
          <p className="text-3xl sm:text-4xl font-black text-white mt-1">{maskSaldo(fmtBRL(saldo), ocultarSaldos)}</p>
          {/* ações rápidas */}
          <div className="flex gap-2 mt-4">
            <button onClick={() => setActiveView('transacoes')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium">
              <ArrowDownLeft size={14} /> Entrada
            </button>
            <button onClick={() => setActiveView('transacoes')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium">
              <ArrowUpRight size={14} /> Saída
            </button>
            <button onClick={() => setActiveView('transferencias')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium">
              <ArrowLeftRight size={14} /> Transferir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        {/* Gráfico evolução */}
        <div className="rounded-2xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-sm font-semibold text-[#e6edf3] mb-3">Evolução do saldo (30 dias)</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={conta.cor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={conta.cor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 10 }} interval={6} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => fmtBRLshort(v)} tick={{ fill: '#8b949e', fontSize: 10 }} axisLine={false} tickLine={false} width={56} />
              <Tooltip formatter={(v) => [fmtBRL(Number(v)), 'Saldo']} contentStyle={{ background: '#141a14', border: '1px solid #30363d', borderRadius: 8 }} labelStyle={{ color: '#e6edf3' }} />
              <Area type="monotone" dataKey="saldo" stroke={conta.cor} strokeWidth={2} fill="url(#gradSaldo)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Extrato */}
        <div>
          <p className="text-sm font-semibold text-[#e6edf3] mb-3">Extrato</p>
          {grupos.length === 0 ? (
            <p className="text-sm text-[#8b949e] text-center py-8">Nenhuma transação nesta conta ainda.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {grupos.map(([dia, items]) => (
                <div key={dia}>
                  <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">{labelDia(dia)}</p>
                  <div className="flex flex-col gap-1.5">
                    {items.map(t => (
                      <div key={t.id} className="flex items-center gap-3 rounded-xl p-3 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <CategoriaIcon categoria={t.categoria} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#e6edf3] truncate">{t.descricao}</p>
                          <p className="text-[11px] text-[#484f58]">{fmtData(t.data)}</p>
                        </div>
                        <span className="text-sm font-semibold" style={{ color: t.tipo === 'entrada' ? '#10b981' : '#ef4444' }}>
                          {t.tipo === 'entrada' ? '+' : '-'}{maskSaldo(fmtBRL(t.valor), ocultarSaldos)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
