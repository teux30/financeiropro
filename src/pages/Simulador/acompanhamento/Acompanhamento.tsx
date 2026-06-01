import { useState, useMemo } from 'react'
import {
  Plus, Target, PiggyBank, Flame, TrendingUp, Pencil, Trash2,
  CheckCircle2, ChevronDown, GitBranch, Calendar, Star,
} from 'lucide-react'
import { useStore } from '../../../store/useStore'
import type { Objetivo } from '../../../store/objetivoTypes'
import {
  patrimonioAlvo, LABEL_PERIODO,
} from '../../../store/objetivoTypes'
import {
  totalGuardado, totalComRendimentos, progressoPercentual, rendaPassivaAtual,
  ritmoReal, statusRitmo, streak, mesAtualVsPlanejado, projecaoComparada,
  marcosAtingidos,
} from '../../../store/objetivoSelectors'
import { fmtBRL } from '../../../lib/format'
import { useCountUp } from '../../../lib/banco-ui'
import { ObjetivoForm } from './ObjetivoForm'
import { AporteModal } from './AporteModal'
import { EvolucaoChart } from './EvolucaoChart'
import { Heatmap } from './Heatmap'

const fmtData = (iso: string | null) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '—'
const fmtMeses = (m: number) => {
  if (!isFinite(m)) return '> 50 anos'
  const a = Math.floor(m / 12), r = Math.round(m % 12)
  if (a === 0) return `${r} ${r === 1 ? 'mês' : 'meses'}`
  if (r === 0) return `${a} ${a === 1 ? 'ano' : 'anos'}`
  return `${a}a ${r}m`
}

export function Acompanhamento() {
  const {
    objetivos, aportesReais, criarObjetivo, atualizarObjetivo, excluirObjetivo,
    definirObjetivoPrincipal, atualizarAporte, excluirAporte,
    exportarObjetivoMapaMental, setActiveProject, setActiveView,
  } = useStore()

  const [formOpen, setFormOpen] = useState(false)
  const [editObj, setEditObj] = useState<Objetivo | null>(null)
  const [aporteOpen, setAporteOpen] = useState(false)
  const [selId, setSelId] = useState<string | null>(null)
  const [showSeletor, setShowSeletor] = useState(false)
  const [histAberto, setHistAberto] = useState(true)

  // objetivo selecionado: o escolhido, ou o principal, ou o primeiro
  const objetivo = useMemo(() => {
    if (selId) return objetivos.find(o => o.id === selId) ?? null
    return objetivos.find(o => o.principal) ?? objetivos[0] ?? null
  }, [objetivos, selId])

  if (objetivos.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#1d9e7515' }}>
            <Target size={30} style={{ color: '#1d9e75' }} />
          </div>
          <div>
            <p className="text-[#e6edf3] font-semibold">Defina seu primeiro objetivo</p>
            <p className="text-[#8b949e] text-sm mt-1 max-w-sm">Estabeleça uma meta e registre o que você guarda para acompanhar sua evolução real até alcançá-la.</p>
          </div>
          <button onClick={() => { setEditObj(null); setFormOpen(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: '#1d9e75' }}>
            <Plus size={16} /> Criar objetivo
          </button>
        </div>
        <ObjetivoForm open={formOpen} onClose={() => setFormOpen(false)} onSave={d => criarObjetivo(d)} />
      </>
    )
  }

  if (!objetivo) return null

  // ── cálculos ────────────────────────────────────────────────────────────────
  const alvo = patrimonioAlvo(objetivo)
  const guardado = totalGuardado(aportesReais, objetivo.id)
  const guardadoRend = totalComRendimentos(objetivo, aportesReais)
  const pct = progressoPercentual(objetivo, aportesReais)
  const falta = Math.max(0, alvo - guardadoRend)
  const rendaAtual = rendaPassivaAtual(objetivo, aportesReais)
  const status = statusRitmo(objetivo, aportesReais)
  const seq = streak(objetivo, aportesReais)
  const ritmo = ritmoReal(objetivo, aportesReais)
  const mesVs = mesAtualVsPlanejado(objetivo, aportesReais)
  const proj = projecaoComparada(objetivo, aportesReais)
  const marcos = marcosAtingidos(pct)
  const periodo = LABEL_PERIODO[objetivo.frequencia]

  const pctAnim = useCountUp(pct)
  const guardadoAnim = useCountUp(guardadoRend)

  const aportesObj = aportesReais.filter(a => a.objetivoId === objetivo.id).sort((a, b) => b.data.localeCompare(a.data))

  const statusCor = status.cor === 'verde' ? '#1d9e75' : status.cor === 'amarelo' ? '#e8a020' : '#ef4444'

  const exportarMapa = () => {
    const pid = exportarObjetivoMapaMental(objetivo.id)
    if (pid) { setActiveProject(pid); setActiveView('editor') }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header: seletor de objetivo + ações ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <button onClick={() => setShowSeletor(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#161b22] border border-[#21262d] hover:border-[#30363d]">
            <Target size={16} style={{ color: '#1d9e75' }} />
            <span className="text-sm font-semibold text-[#e6edf3]">{objetivo.nome}</span>
            {objetivo.principal && <Star size={12} className="fill-[#e8a020] text-[#e8a020]" />}
            <ChevronDown size={14} className="text-[#8b949e]" />
          </button>
          {showSeletor && (
            <div className="absolute z-20 mt-1 w-64 bg-[#161b22] border border-[#30363d] rounded-xl shadow-xl overflow-hidden">
              {objetivos.map(o => (
                <button key={o.id} onClick={() => { setSelId(o.id); setShowSeletor(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-[#21262d]"
                  style={{ color: o.id === objetivo.id ? '#1d9e75' : '#e6edf3' }}>
                  <Target size={14} />
                  <span className="flex-1 truncate">{o.nome}</span>
                  {o.principal && <Star size={11} className="fill-[#e8a020] text-[#e8a020]" />}
                </button>
              ))}
              <button onClick={() => { setShowSeletor(false); setEditObj(null); setFormOpen(true) }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-[#1d9e75] hover:bg-[#21262d] border-t border-[#30363d]">
                <Plus size={14} /> Novo objetivo
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!objetivo.principal && (
            <button onClick={() => definirObjetivoPrincipal(objetivo.id)}
              className="p-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e8a020]" title="Tornar principal">
              <Star size={14} />
            </button>
          )}
          <button onClick={exportarMapa} className="p-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3]" title="Exportar para mapa mental">
            <GitBranch size={14} />
          </button>
          <button onClick={() => { setEditObj(objetivo); setFormOpen(true) }} className="p-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3]" title="Editar">
            <Pencil size={14} />
          </button>
          <button onClick={() => { if (confirm('Excluir este objetivo e seus aportes?')) { excluirObjetivo(objetivo.id); setSelId(null) } }}
            className="p-2 rounded-lg bg-[#21262d] hover:bg-[#da3633] text-[#8b949e] hover:text-white" title="Excluir">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* ── Botão grande: guardar dinheiro ──────────────────────────────────── */}
      <button onClick={() => setAporteOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-base shadow-lg transition-transform hover:scale-[1.01]"
        style={{ background: 'linear-gradient(135deg, #1d9e75, #10b981)' }}>
        <PiggyBank size={22} /> + Guardar dinheiro
      </button>

      {/* aporte recorrente pré-preenchido */}
      <button onClick={() => setAporteOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border border-[#1d9e7544] text-[#1d9e75] hover:bg-[#1d9e7510] transition-colors">
        <CheckCircle2 size={15} /> Confirmar aporte {objetivo.frequencia === 'diario' ? 'de hoje' : objetivo.frequencia === 'semanal' ? 'desta semana' : 'deste mês'} ({fmtBRL(objetivo.valorPlanejado)})
      </button>

      {/* ── Cards de progresso ──────────────────────────────────────────────── */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5">
        <div className="flex items-end justify-between mb-3 flex-wrap gap-2">
          <div>
            <p className="text-xs text-[#8b949e]">Já guardado</p>
            <p className="text-3xl font-black" style={{ color: '#1d9e75' }}>{fmtBRL(guardadoAnim)}</p>
            <p className="text-xs text-[#8b949e] mt-0.5">Aportado: {fmtBRL(guardado)} · Rendimentos: {fmtBRL(Math.max(0, guardadoRend - guardado))}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#8b949e]">Meta</p>
            <p className="text-lg font-bold text-[#e6edf3]">{isFinite(alvo) ? fmtBRL(alvo) : '∞'}</p>
          </div>
        </div>
        {/* barra animada */}
        <div className="h-3 rounded-full bg-[#21262d] overflow-hidden mb-2">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, pctAnim)}%`, background: 'linear-gradient(90deg, #1d9e75, #10b981)' }} />
        </div>
        <div className="flex justify-between text-xs">
          <span className="font-semibold" style={{ color: '#1d9e75' }}>{pct.toFixed(1)}% atingido</span>
          <span className="text-[#8b949e]">Falta {fmtBRL(falta)}</span>
        </div>

        {/* marcos */}
        {marcos.length > 0 && (
          <div className="flex gap-2 mt-3">
            {[25, 50, 75, 100].map(m => (
              <span key={m} className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: marcos.includes(m) ? '#1d9e7522' : '#21262d', color: marcos.includes(m) ? '#1d9e75' : '#484f58' }}>
                {marcos.includes(m) ? `✓ ${m}%` : `${m}%`}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Indicadores de ritmo ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1"><TrendingUp size={13} style={{ color: '#1d9e75' }} /><span className="text-[11px] text-[#8b949e]">Renda atual estimada</span></div>
          <p className="text-lg font-bold text-[#1d9e75]">{fmtBRL(rendaAtual)}<span className="text-xs text-[#8b949e]">/mês</span></p>
        </div>
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <span className="text-[11px] text-[#8b949e]">Status do ritmo</span>
          <p className="text-lg font-bold flex items-center gap-1" style={{ color: statusCor }}>{status.emoji} {status.texto}</p>
        </div>
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <span className="text-[11px] text-[#8b949e]">Média por {periodo}</span>
          <p className="text-lg font-bold text-[#e6edf3]">{fmtBRL(ritmo)}</p>
        </div>
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1"><Flame size={13} style={{ color: '#e8a020' }} /><span className="text-[11px] text-[#8b949e]">Sequência</span></div>
          <p className="text-lg font-bold text-[#e8a020]">{seq} {objetivo.frequencia === 'diario' ? (seq === 1 ? 'dia' : 'dias') : objetivo.frequencia === 'semanal' ? (seq === 1 ? 'semana' : 'semanas') : (seq === 1 ? 'mês' : 'meses')}</p>
        </div>
      </div>

      {/* este mês vs planejado */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[#e6edf3]">Este mês vs planejado</span>
          <span className="text-xs text-[#8b949e]">{fmtBRL(mesVs.real)} de {fmtBRL(mesVs.planejado)}</span>
        </div>
        <div className="h-2 rounded-full bg-[#21262d] overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${mesVs.planejado > 0 ? Math.min(100, (mesVs.real / mesVs.planejado) * 100) : 0}%`, background: mesVs.real >= mesVs.planejado ? '#1d9e75' : '#e8a020' }} />
        </div>
      </div>

      {/* ── Projeção real vs planejado ──────────────────────────────────────── */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} style={{ color: '#1d9e75' }} />
          <h2 className="text-base font-semibold text-[#e6edf3]">Quando você atinge a meta</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-[#8b949e]">No ritmo planejado</p>
            <p className="text-base font-bold text-[#3b82f6]">{fmtData(proj.dataPlanejada)}</p>
            <p className="text-xs text-[#484f58]">{fmtMeses(proj.prazoPlanejadoMeses)}</p>
          </div>
          <div>
            <p className="text-xs text-[#8b949e]">No seu ritmo atual</p>
            <p className="text-base font-bold" style={{ color: proj.adiantado ? '#1d9e75' : '#e8a020' }}>{fmtData(proj.dataReal)}</p>
            <p className="text-xs text-[#484f58]">{fmtMeses(proj.prazoRealMeses)}</p>
          </div>
        </div>
        {aportesObj.length > 0 && (
          proj.adiantado ? (
            <div className="text-sm p-3 rounded-lg" style={{ background: '#1d9e7515', color: '#1d9e75' }}>
              🎉 Você vai atingir a meta {fmtMeses(Math.abs(proj.diferencaMeses))} antes do planejado!
            </div>
          ) : proj.diferencaMeses > 0.5 ? (
            <div className="text-sm p-3 rounded-lg" style={{ background: '#e8a02015', color: '#e8a020' }}>
              Nesse ritmo, vai levar {fmtMeses(proj.diferencaMeses)} a mais. Para voltar ao plano, guarde {fmtBRL(proj.aporteCorretivo)} por {periodo}.
            </div>
          ) : (
            <div className="text-sm p-3 rounded-lg" style={{ background: '#1d9e7515', color: '#1d9e75' }}>
              Você está dentro do plano. Continue assim! 👏
            </div>
          )
        )}
      </div>

      {/* ── Gráfico de evolução ─────────────────────────────────────────────── */}
      <EvolucaoChart objetivo={objetivo} aportes={aportesReais} />

      {/* ── Heatmap ─────────────────────────────────────────────────────────── */}
      <Heatmap objetivo={objetivo} aportes={aportesReais} />

      {/* ── Histórico de aportes ────────────────────────────────────────────── */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
        <button onClick={() => setHistAberto(v => !v)} className="flex items-center justify-between w-full px-5 py-4">
          <h2 className="text-base font-semibold text-[#e6edf3]">Histórico de aportes <span className="text-[#8b949e] text-sm">({aportesObj.length})</span></h2>
          <ChevronDown size={16} className={`text-[#8b949e] transition-transform ${histAberto ? 'rotate-180' : ''}`} />
        </button>
        {histAberto && (
          aportesObj.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-[#8b949e]">Nenhum aporte ainda. Comece guardando! 💪</p>
          ) : (
            <div className="flex flex-col">
              {aportesObj.map(a => (
                <div key={a.id} className="group flex items-center gap-3 px-5 py-3 border-t border-[#21262d] hover:bg-[#1c2128]">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#1d9e7515' }}>
                    <PiggyBank size={15} style={{ color: '#1d9e75' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#e6edf3]">{fmtBRL(a.valor)}</p>
                    <p className="text-xs text-[#484f58]">{new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR')}{a.observacao ? ` · ${a.observacao}` : ''}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { const v = prompt('Novo valor:', String(a.valor)); if (v) atualizarAporte(a.id, { valor: parseFloat(v) || a.valor }) }}
                      className="p-1.5 rounded text-[#8b949e] hover:text-[#e6edf3]"><Pencil size={13} /></button>
                    <button onClick={() => excluirAporte(a.id)} className="p-1.5 rounded text-[#8b949e] hover:text-[#ef4444]"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
              <div className="px-5 py-3 border-t border-[#21262d] flex justify-between text-sm">
                <span className="text-[#8b949e]">Total guardado</span>
                <span className="font-bold text-[#1d9e75]">{fmtBRL(guardado)}</span>
              </div>
            </div>
          )
        )}
      </div>

      {/* modais */}
      <ObjetivoForm open={formOpen} onClose={() => setFormOpen(false)}
        initial={editObj ?? undefined}
        onSave={d => { if (editObj) atualizarObjetivo(editObj.id, d); else criarObjetivo(d) }} />
      <AporteModal open={aporteOpen} onClose={() => setAporteOpen(false)}
        objetivo={objetivo} valorSugerido={objetivo.valorPlanejado} />
    </div>
  )
}
