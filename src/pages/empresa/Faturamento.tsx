import { useState, useMemo } from 'react'
import { Target, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { inicioSemana, fimSemana } from '../../store/empresaTypes'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { fmtBRL, maskSaldo } from '../../lib/format'

const MES_NOMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const fmtDM = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export function FaturamentoPage() {
  const { getEmpresaAtiva, getBanco, ocultarSaldos, getMetaFaturamento, setMetaFaturamento } = useStore()
  const emp = getEmpresaAtiva()
  const now = new Date()
  const [ano, setAno] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [editMeta, setEditMeta] = useState(false)

  const banco = getBanco('empresa')
  const ym = `${ano}-${String(mes).padStart(2, '0')}`

  const txMes = useMemo(() => banco.transacoes.filter(t => t.categoria !== 'transferencia' && !t.transferenciaId && t.data.startsWith(ym)), [banco.transacoes, ym])
  const realizado = txMes.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0)
  const saidas = txMes.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0)
  const lucro = realizado - saidas
  const meta = getMetaFaturamento(ym)
  const pct = meta > 0 ? (realizado / meta) * 100 : 0

  // Controle semanal do mês
  const semanas = useMemo(() => {
    const primeiro = `${ym}-01`
    const ultimo = `${ym}-${String(new Date(ano, mes, 0).getDate()).padStart(2, '0')}`
    const out: { ini: string; fim: string; entradas: number; saidas: number }[] = []
    let cursor = inicioSemana(primeiro)
    let guard = 0
    while (cursor <= ultimo && guard < 8) {
      const fim = fimSemana(cursor)
      const naSemana = banco.transacoes.filter(t => t.categoria !== 'transferencia' && !t.transferenciaId && t.data.slice(0, 10) >= cursor && t.data.slice(0, 10) <= fim)
      out.push({
        ini: cursor, fim,
        entradas: naSemana.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0),
        saidas: naSemana.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0),
      })
      const d = new Date(cursor + 'T00:00:00'); d.setDate(d.getDate() + 7); cursor = d.toISOString().slice(0, 10); guard++
    }
    return out
  }, [banco.transacoes, ym, ano, mes])

  // Receita por plataforma
  const plataformas = useMemo(() => {
    const map = new Map<string, number>()
    txMes.filter(t => t.tipo === 'entrada').forEach(t => {
      const p = t.plataforma || 'Não informado'
      map.set(p, (map.get(p) ?? 0) + t.valor)
    })
    return [...map.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor)
  }, [txMes])

  const mudarMes = (d: number) => { let m = mes + d, a = ano; if (m < 1) { m = 12; a-- } else if (m > 12) { m = 1; a++ } setMes(m); setAno(a) }
  if (!emp) return <div className="flex-1 flex items-center justify-center text-[#8b949e]">Nenhuma empresa ativa.</div>

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#e8a02022' }}><Target size={18} style={{ color: '#e8a020' }} /></div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#e6edf3]">Faturamento & Metas</h1>
            <p className="text-xs text-[#8b949e]">Meta vs realizado · controle semanal</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => mudarMes(-1)} className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3]"><ChevronLeft size={18} /></button>
            <span className="text-sm font-medium text-[#e6edf3]">{MES_NOMES[mes - 1].slice(0, 3)}/{ano}</span>
            <button onClick={() => mudarMes(1)} className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3]"><ChevronRight size={18} /></button>
          </div>
        </div>

        {/* Meta vs realizado */}
        <div className="rounded-2xl p-6 border" style={{ background: '#141a14', borderColor: '#e8a02033' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-[#8b949e]">Faturamento do mês</p>
            <button onClick={() => setEditMeta(true)} className="text-xs flex items-center gap-1 text-[#8b949e] hover:text-[#e6edf3]"><Pencil size={12} /> meta</button>
          </div>
          <p className="text-4xl font-black mt-1" style={{ color: '#e8a020' }}>{maskSaldo(fmtBRL(realizado), ocultarSaldos)}</p>
          <p className="text-sm text-[#8b949e] mt-1">Meta: {meta > 0 ? fmtBRL(meta) : '— defina'} {meta > 0 && <span style={{ color: pct >= 100 ? '#1d9e75' : '#e8a020' }}>· {pct.toFixed(0)}%</span>}</p>
          {meta > 0 && (
            <div className="h-3 rounded-full bg-[#21262d] overflow-hidden mt-3">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: pct >= 100 ? 'linear-gradient(90deg,#1d9e75,#10b981)' : 'linear-gradient(90deg,#e8a020,#f59e0b)' }} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div><p className="text-[11px] text-[#8b949e]">Saídas</p><p className="text-sm font-bold text-[#ef4444]">{maskSaldo(fmtBRL(saidas), ocultarSaldos)}</p></div>
            <div><p className="text-[11px] text-[#8b949e]">Resultado</p><p className="text-sm font-bold" style={{ color: lucro >= 0 ? '#1d9e75' : '#ef4444' }}>{maskSaldo(fmtBRL(lucro), ocultarSaldos)}</p></div>
          </div>
        </div>

        {/* Controle semanal */}
        <div>
          <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">Controle semanal</p>
          <div className="rounded-xl border overflow-hidden" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            {semanas.map((s, i) => {
              const saldo = s.entradas - s.saidas
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#21262d] last:border-0">
                  <span className="flex-1 text-sm text-[#e6edf3]">{fmtDM(s.ini)}–{fmtDM(s.fim)}</span>
                  <span className="text-xs text-[#1d9e75]">+{maskSaldo(fmtBRL(s.entradas), ocultarSaldos)}</span>
                  <span className="text-xs text-[#ef4444]">−{maskSaldo(fmtBRL(s.saidas), ocultarSaldos)}</span>
                  <span className="text-sm font-semibold w-24 text-right" style={{ color: saldo >= 0 ? '#1d9e75' : '#ef4444' }}>{maskSaldo(fmtBRL(saldo), ocultarSaldos)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Receita por plataforma */}
        {plataformas.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">Receita por plataforma</p>
            <div className="rounded-xl border overflow-hidden" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
              {plataformas.map((p, i) => {
                const pctP = realizado > 0 ? (p.valor / realizado) * 100 : 0
                return (
                  <div key={i} className="px-4 py-2.5 border-b border-[#21262d] last:border-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[#e6edf3]">{p.nome}</span>
                      <span className="text-sm font-semibold text-[#e8a020]">{maskSaldo(fmtBRL(p.valor), ocultarSaldos)} <span className="text-[11px] text-[#8b949e]">({pctP.toFixed(0)}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#21262d] overflow-hidden"><div className="h-full bg-[#e8a020]" style={{ width: `${pctP}%` }} /></div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <MetaModal open={editMeta} onClose={() => setEditMeta(false)} mesLabel={`${MES_NOMES[mes - 1]}/${ano}`} valor={meta} onSave={v => { setMetaFaturamento(ym, v); setEditMeta(false) }} />
    </div>
  )
}

function MetaModal({ open, onClose, mesLabel, valor, onSave }: { open: boolean; onClose: () => void; mesLabel: string; valor: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(valor || ''))
  return (
    <Modal open={open} onClose={onClose} title={`Meta de faturamento — ${mesLabel}`}>
      <div className="flex flex-col gap-4">
        <Input label="Meta (R$)" type="number" inputMode="decimal" value={v} onChange={e => setV(e.target.value)} autoFocus />
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={() => onSave(parseFloat(v) || 0)} className="flex-1 text-white" style={{ background: '#e8a020' } as React.CSSProperties}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}
