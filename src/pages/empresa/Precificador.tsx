import { useState } from 'react'
import { Calculator, Settings, AlertTriangle, TrendingUp } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { ConfigPrecificacao } from '../../store/empresaTypes'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { fmtBRL } from '../../lib/format'

export function PrecificadorPage() {
  const {
    getEmpresaAtiva, getCardapio, getCustoItemCardapio,
    getConfigPrecificacao, setConfigPrecificacao,
    getCustoFixoPct, getMarkupDivisor, getPrecoSugerido, atualizarItemCardapio,
  } = useStore()
  const emp = getEmpresaAtiva()
  const cfg = getConfigPrecificacao()
  const itens = getCardapio()
  const [modal, setModal] = useState(false)

  if (!emp) return <div className="flex-1 flex items-center justify-center text-[#8b949e]">Nenhuma empresa ativa.</div>

  const cfPct = getCustoFixoPct()
  const divisor = getMarkupDivisor()
  const markup = divisor > 0 ? 1 / divisor : 0
  const inviavel = divisor <= 0
  const somaPct = cfg.despesasVariaveisPct + cfg.lucroDesejadoPct + cfPct

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#e8a02022' }}><Calculator size={18} style={{ color: '#e8a020' }} /></div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#e6edf3]">Precificador Inteligente</h1>
            <p className="text-xs text-[#8b949e]">Preço de venda ideal por markup</p>
          </div>
          <button onClick={() => setModal(true)} className="p-2 rounded-lg bg-[#161b22] border border-[#21262d] text-[#8b949e] hover:text-[#e6edf3]" title="Configurar"><Settings size={16} /></button>
        </div>

        {/* SummaryCards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card label="Custo fixo / venda" value={`${cfPct.toFixed(1)}%`} />
          <Card label="Despesas variáveis" value={`${cfg.despesasVariaveisPct.toFixed(1)}%`} />
          <Card label="Lucro desejado" value={`${cfg.lucroDesejadoPct.toFixed(1)}%`} accent />
          <Card label="Markup" value={inviavel ? '—' : `${markup.toFixed(2)}×`} accent />
        </div>

        {inviavel && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: '#ef444411', color: '#ef4444' }}>
            <AlertTriangle size={14} /> A soma (custo fixo {cfPct.toFixed(0)}% + variáveis {cfg.despesasVariaveisPct.toFixed(0)}% + lucro {cfg.lucroDesejadoPct.toFixed(0)}% = {somaPct.toFixed(0)}%) chega a 100% ou mais — markup impossível. Ajuste a configuração.
          </div>
        )}

        {cfg.faturamentoEstimado <= 0 && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: '#e8a02011', color: '#e8a020' }}>
            <Settings size={14} /> Configure custos fixos, pró-labore e faturamento estimado para o cálculo ficar preciso.
          </div>
        )}

        {/* Tabela de produtos */}
        {itens.length === 0 ? (
          <p className="text-sm text-[#8b949e] text-center py-8">Cadastre itens no Cardápio para precificar.</p>
        ) : (
          <div className="rounded-xl border overflow-x-auto" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-[#8b949e] uppercase tracking-wider">
                  {['Produto', 'Custo', 'Preço atual', 'Sugerido', 'Margem atual', ''].map(h => <th key={h} className="px-3 py-2.5 whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {itens.map(i => {
                  const custo = getCustoItemCardapio(i)
                  const sugerido = getPrecoSugerido(custo)
                  const margemAtual = i.precoVenda > 0 ? ((i.precoVenda - custo) / i.precoVenda) * 100 : 0
                  const abaixo = sugerido > 0 && i.precoVenda < sugerido - 0.01
                  return (
                    <tr key={i.id} className="border-t border-[#21262d]">
                      <td className="px-3 py-2.5 text-[#e6edf3]">{i.nome}</td>
                      <td className="px-3 py-2.5 text-[#8b949e] whitespace-nowrap">{fmtBRL(custo)}</td>
                      <td className="px-3 py-2.5 text-[#e6edf3] whitespace-nowrap">{fmtBRL(i.precoVenda)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-semibold" style={{ color: inviavel ? '#8b949e' : '#e8a020' }}>{inviavel ? '—' : fmtBRL(sugerido)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap font-semibold" style={{ color: margemAtual >= 50 ? '#1d9e75' : margemAtual >= 30 ? '#e8a020' : '#ef4444' }}>{margemAtual.toFixed(0)}%</td>
                      <td className="px-3 py-2.5">
                        {!inviavel && abaixo && (
                          <button onClick={() => atualizarItemCardapio(i.id, { precoVenda: Math.round(sugerido * 100) / 100 })}
                            className="text-[11px] px-2 py-1 rounded-md text-white flex items-center gap-1" style={{ background: '#1d9e75' }} title="Aplicar preço sugerido">
                            <TrendingUp size={11} /> aplicar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfigModal open={modal} onClose={() => setModal(false)} cfg={cfg} onSave={setConfigPrecificacao} />
    </div>
  )
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
      <p className="text-[11px] text-[#8b949e]">{label}</p>
      <p className="text-lg font-bold" style={{ color: accent ? '#e8a020' : '#e6edf3' }}>{value}</p>
    </div>
  )
}

function ConfigModal({ open, onClose, cfg, onSave }: {
  open: boolean; onClose: () => void; cfg: ConfigPrecificacao; onSave: (c: Partial<ConfigPrecificacao>) => void
}) {
  const [f, setF] = useState({
    custosFixosMensais: String(cfg.custosFixosMensais || ''),
    proLabore: String(cfg.proLabore || ''),
    faturamentoEstimado: String(cfg.faturamentoEstimado || ''),
    despesasVariaveisPct: String(cfg.despesasVariaveisPct || ''),
    lucroDesejadoPct: String(cfg.lucroDesejadoPct || ''),
  })
  const num = (v: string) => parseFloat(v) || 0
  return (
    <Modal open={open} onClose={onClose} title="Configuração de precificação">
      <div className="flex flex-col gap-4">
        <Input label="Custos fixos mensais (R$)" type="number" inputMode="decimal" value={f.custosFixosMensais} onChange={e => setF(s => ({ ...s, custosFixosMensais: e.target.value }))} placeholder="aluguel, energia..." />
        <Input label="Pró-labore (R$/mês)" type="number" inputMode="decimal" value={f.proLabore} onChange={e => setF(s => ({ ...s, proLabore: e.target.value }))} />
        <Input label="Faturamento estimado (R$/mês)" type="number" inputMode="decimal" value={f.faturamentoEstimado} onChange={e => setF(s => ({ ...s, faturamentoEstimado: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Despesas variáveis (%)" type="number" inputMode="decimal" value={f.despesasVariaveisPct} onChange={e => setF(s => ({ ...s, despesasVariaveisPct: e.target.value }))} placeholder="taxas, impostos" />
          <Input label="Lucro desejado (%)" type="number" inputMode="decimal" value={f.lucroDesejadoPct} onChange={e => setF(s => ({ ...s, lucroDesejadoPct: e.target.value }))} />
        </div>
        <p className="text-[11px] text-[#484f58]">O custo fixo % é rateado automaticamente: (custos fixos + pró-labore) ÷ faturamento estimado.</p>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={() => { onSave({ custosFixosMensais: num(f.custosFixosMensais), proLabore: num(f.proLabore), faturamentoEstimado: num(f.faturamentoEstimado), despesasVariaveisPct: num(f.despesasVariaveisPct), lucroDesejadoPct: num(f.lucroDesejadoPct) }); onClose() }}
            className="flex-1 text-white" style={{ background: '#e8a020' } as React.CSSProperties}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}
