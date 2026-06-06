import { useMemo, useState } from 'react'
import {
  AlertTriangle, Clock, Bell, PiggyBank, Bike, CheckCircle2,
  StickyNote, Plus, ArrowRight, Check, ListChecks,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { calcularAvisos, daysUntil } from '../../lib/avisos'
import { getConfigEntregadores, inicioSemana, resumoTodos } from '../../store/entregadorSelectors'
import { fmtBRL } from '../../lib/format'
import { NOTA_CORES } from '../../store/notasTypes'
import type { Nota } from '../../store/notasTypes'
import type { Perfil } from '../../store/useStore'
import type { CategoriaFin } from '../../store/bancoTypes'

type Visao = 'tudo' | 'pessoal' | 'empresa'

interface AlertaItem {
  id: string
  nivel: 0 | 1 | 2          // 0 = urgente (vermelho), 1 = atenção (âmbar), 2 = informativo (azul/verde)
  icon: typeof AlertTriangle
  titulo: string
  sub?: string
  valor?: number
  contexto?: Perfil
  onPagar?: () => void
  onResolver?: () => void
  onVer?: () => void
}

const NIVEL_COR = ['#ef4444', '#e8a020', '#3b82f6']
const CTX_COR: Record<Perfil, string> = { pessoal: '#1d9e75', empresa: '#e8a020' }

export function PainelDestaque({ visao }: { visao: Visao }) {
  const s = useStore()
  const {
    perfilAtivo, empresas, notifPrefs, avisosLidos, marcarAvisoLido,
    atualizarContaPagar, getBanco, registrarTransacao,
    getNotas, getLembretesProximos, criarNota, atualizarNota,
    objetivos, setActiveView, setPerfilAtivo,
  } = s

  const verPessoal = visao !== 'empresa'
  const verEmpresa = visao !== 'pessoal'
  const accent = perfilAtivo === 'pessoal' ? '#1d9e75' : '#e8a020'

  // ── marcar conta paga (mesma integração do sino) ──────────────────────────
  const marcarContaPaga = (empresaId: string, contaId: string) => {
    const emp = empresas.find(e => e.id === empresaId)
    const conta = emp?.contasPagar.find(c => c.id === contaId)
    if (!emp || !conta) return
    atualizarContaPagar(emp.id, conta.id, { status: 'pago' })
    // quitar = transação real (realizado); não grava no fluxoCaixa legado (evita dupla contagem)
    const bancoEmp = getBanco('empresa')
    const padrao = bancoEmp.contas.find(c => c.contaPadrao) ?? bancoEmp.contas[0]
    if (padrao) {
      const catMap: Record<string, CategoriaFin> = {
        fornecedores: 'insumos', folha: 'folha', aluguel: 'aluguel', utilidades: 'utilidades',
        marketing: 'marketing', impostos: 'impostos', manutencao: 'manutencao', outros_saida: 'outros_saida',
      }
      registrarTransacao({
        contaId: padrao.id, tipo: 'saida', valor: conta.valor, descricao: conta.descricao,
        categoria: catMap[conta.categoria] ?? 'outros_saida', data: new Date().toISOString().slice(0, 10),
        recorrente: false, origemAuto: 'conta_pagar',
      }, 'empresa')
    }
  }

  // ── alertas consolidados ──────────────────────────────────────────────────
  const alertas = useMemo<AlertaItem[]>(() => {
    const out: AlertaItem[] = []
    const janela = Math.max(...(notifPrefs.antecedencias.length ? notifPrefs.antecedencias : [7]))

    // Contas a pagar (empresa) — integradas ao sino
    if (verEmpresa) {
      calcularAvisos(empresas, janela)
        .filter(a => !avisosLidos.includes(a.id))
        .forEach(a => out.push({
          id: 'conta-' + a.id,
          nivel: a.dias <= 0 ? 0 : a.dias <= 2 ? 1 : 2,
          icon: Clock, titulo: a.descricao,
          sub: a.dias < 0 ? `vencido há ${Math.abs(a.dias)}d` : a.dias === 0 ? 'vence hoje' : a.dias === 1 ? 'vence amanhã' : `vence em ${a.dias}d`,
          valor: a.valor, contexto: 'empresa',
          onPagar: () => marcarContaPaga(a.empresaId, a.id),
          onVer: () => { setPerfilAtivo('empresa'); setActiveView('empresa_pagar') },
        }))

      // Fechamento semanal de entregadores — lembra no dia do fechamento (ou depois) se há pendentes
      const diaHoje = new Date().getDay()
      empresas.forEach(e => {
        const cfg = getConfigEntregadores(e)
        const semIni = inicioSemana(new Date().toISOString().slice(0, 10), cfg.inicioSemanaDia)
        const pendentes = resumoTodos(e, semIni).filter(r => !r.pago && r.total > 0)
        if (pendentes.length === 0) return
        const total = pendentes.reduce((sum, r) => sum + r.total, 0)
        // só vira alerta a partir do dia de fechamento da semana
        const ehDiaFechamento = diaHoje === cfg.diaPagamento || diaHoje === (cfg.inicioSemanaDia + 6) % 7
        out.push({
          id: 'entreg-' + e.id, nivel: ehDiaFechamento ? 0 : 1, icon: Bike,
          titulo: 'Fechar semana dos entregadores',
          sub: ehDiaFechamento ? `${pendentes.length} a pagar · estimado` : `${pendentes.length} pendente(s) esta semana`,
          valor: total, contexto: 'empresa',
          onVer: () => { setPerfilAtivo('empresa'); setActiveView('empresa_entregadores') },
        })
      })
    }

    // Lembretes do bloco de notas (por contexto)
    const ctxNotas: Perfil[] = visao === 'tudo' ? ['pessoal', 'empresa'] : [visao as Perfil]
    ctxNotas.forEach(ctx => {
      getLembretesProximos(ctx).forEach(n => {
        const d = daysUntil(n.dataLembrete!)
        if (d > 7) return
        out.push({
          id: 'lemb-' + ctx + '-' + n.id,
          nivel: d <= 0 ? 0 : d <= 2 ? 1 : 2,
          icon: Bell, titulo: n.titulo || n.texto.slice(0, 50) || 'Lembrete',
          sub: d < 0 ? 'atrasado' : d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d}d`,
          contexto: ctx,
          onResolver: () => atualizarNota(n.id, { lembreteResolvido: true }, ctx),
          onVer: () => { setPerfilAtivo(ctx); setActiveView('notas') },
        })
      })
    })

    // Objetivo principal (pessoal)
    if (verPessoal) {
      const obj = objetivos.find(o => o.principal) ?? objetivos[0]
      if (obj) out.push({
        id: 'obj-' + obj.id, nivel: 2, icon: PiggyBank,
        titulo: `Aporte do objetivo "${obj.nome}"`, sub: 'mantenha o ritmo',
        contexto: 'pessoal',
        onVer: () => { setPerfilAtivo('pessoal'); setActiveView('simulador') },
      })
    }

    // ordena por nível (urgência) e depois por valor
    return out.sort((a, b) => a.nivel - b.nivel || (b.valor ?? 0) - (a.valor ?? 0))
  }, [empresas, notifPrefs, avisosLidos, visao, verPessoal, verEmpresa, objetivos]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── notas fixadas ─────────────────────────────────────────────────────────
  const notasFixadas = useMemo(() => {
    const ctxs: Perfil[] = visao === 'tudo' ? ['pessoal', 'empresa'] : [visao as Perfil]
    const lista: { nota: Nota; ctx: Perfil }[] = []
    ctxs.forEach(ctx => getNotas(ctx).filter(n => n.fixada && !n.arquivada).forEach(nota => lista.push({ nota, ctx })))
    return lista
  }, [visao, getNotas])

  const totalNotas = useMemo(() => {
    const ctxs: Perfil[] = visao === 'tudo' ? ['pessoal', 'empresa'] : [visao as Perfil]
    return ctxs.reduce((sum, ctx) => sum + getNotas(ctx).filter(n => !n.arquivada).length, 0)
  }, [visao, getNotas])

  const [quick, setQuick] = useState('')
  const salvarQuick = () => {
    if (!quick.trim()) return
    criarNota({ tipo: 'simples', titulo: '', texto: quick.trim(), cor: NOTA_CORES[0], tags: [], fixada: false, arquivada: false }, perfilAtivo)
    setQuick('')
  }

  const urgentes = alertas.filter(a => a.nivel === 0).length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── COLUNA 1: ALERTAS E LEMBRETES ── */}
      <div className="rounded-2xl p-5 border flex flex-col gap-3" style={{ background: '#141a14', borderColor: urgentes > 0 ? '#ef444455' : 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className={urgentes > 0 ? 'text-[#ef4444] animate-pulse' : 'text-[#e8a020]'} />
            <span className="text-base font-semibold text-[#e6edf3]">Alertas e Lembretes</span>
          </div>
          {alertas.length > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: urgentes > 0 ? '#ef4444' : '#e8a020' }}>
              {alertas.length}
            </span>
          )}
        </div>

        {alertas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <CheckCircle2 size={28} className="text-[#1d9e75]" />
            <p className="text-sm font-medium text-[#1d9e75]">Tudo em dia! ✓</p>
            <p className="text-xs text-[#8b949e]">Nenhuma pendência precisando de atenção.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-[#8b949e] -mt-1">
              Você tem <strong className="text-[#e6edf3]">{alertas.length}</strong> {alertas.length === 1 ? 'item precisando' : 'itens precisando'} de atenção
            </p>
            <div className="flex flex-col gap-2">
              {alertas.slice(0, 6).map(a => {
                const cor = NIVEL_COR[a.nivel]
                const Icon = a.icon
                return (
                  <div key={a.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: `${cor}10`, borderLeft: `3px solid ${cor}` }}>
                    <Icon size={15} style={{ color: cor }} className={`shrink-0 mt-0.5 ${a.nivel === 0 ? 'animate-pulse' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-[#e6edf3] truncate flex-1">{a.titulo}</p>
                        {a.contexto && (
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CTX_COR[a.contexto] }} title={a.contexto === 'pessoal' ? 'Pessoal' : 'Empresa'} />
                        )}
                      </div>
                      <p className="text-xs" style={{ color: cor }}>
                        {a.sub}{a.valor != null ? ` · ${fmtBRL(a.valor)}` : ''}
                      </p>
                      {(a.onPagar || a.onResolver || a.onVer) && (
                        <div className="flex gap-2 mt-1.5">
                          {a.onPagar && <button onClick={a.onPagar} className="text-[11px] px-2 py-1 rounded-md text-white" style={{ background: '#1d9e75' }}>Marcar pago</button>}
                          {a.onResolver && <button onClick={a.onResolver} className="text-[11px] px-2 py-1 rounded-md text-white" style={{ background: '#1d9e75' }}>Resolver</button>}
                          {a.onVer && <button onClick={a.onVer} className="text-[11px] px-2 py-1 rounded-md text-[#8b949e] hover:text-[#e6edf3]">Ver</button>}
                          <button onClick={() => a.id.startsWith('conta-') ? marcarAvisoLido(a.id.replace('conta-', '')) : undefined}
                            className="text-[11px] px-2 py-1 rounded-md text-[#484f58] hover:text-[#8b949e]">{a.id.startsWith('conta-') ? 'Adiar' : ''}</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {alertas.length > 6 && <p className="text-xs text-[#8b949e] text-center">+ {alertas.length - 6} outros</p>}
          </>
        )}
      </div>

      {/* ── COLUNA 2: NOTAS FIXADAS ── */}
      <div className="rounded-2xl p-5 border flex flex-col gap-3" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote size={16} style={{ color: accent }} />
            <span className="text-base font-semibold text-[#e6edf3]">Notas Fixadas</span>
          </div>
          <button onClick={() => { setActiveView('notas') }} className="text-xs flex items-center gap-1" style={{ color: accent }}>
            ver todas <ArrowRight size={12} />
          </button>
        </div>

        {/* captura rápida */}
        <div className="flex gap-2">
          <input
            value={quick} onChange={e => setQuick(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') salvarQuick() }}
            placeholder="Anote algo rápido..."
            className="flex-1 bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none"
            style={{ fontSize: 16 }}
          />
          <button onClick={salvarQuick} disabled={!quick.trim()} className="px-3 rounded-lg text-white disabled:opacity-40" style={{ background: accent }}>
            <Plus size={16} />
          </button>
        </div>

        {notasFixadas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-1.5">
            <StickyNote size={24} className="text-[#30363d]" />
            <p className="text-xs text-[#8b949e]">Nenhuma nota fixada.</p>
            <p className="text-[11px] text-[#484f58]">Fixe uma nota (📌) para vê-la aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {notasFixadas.slice(0, 4).map(({ nota: n, ctx }) => {
              const feitos = (n.itensChecklist ?? []).filter(i => i.feito).length
              const total = (n.itensChecklist ?? []).length
              return (
                <button key={ctx + n.id}
                  onClick={() => { setPerfilAtivo(ctx); setActiveView('notas') }}
                  className="text-left rounded-xl p-3 border flex flex-col gap-1" style={{ background: `${n.cor}14`, borderColor: `${n.cor}44` }}>
                  <div className="flex items-center gap-1.5">
                    {n.tipo === 'checklist' && <ListChecks size={12} style={{ color: n.cor }} className="shrink-0" />}
                    {n.titulo && <p className="text-xs font-semibold text-[#e6edf3] truncate flex-1">{n.titulo}</p>}
                    {visao === 'tudo' && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CTX_COR[ctx] }} />}
                  </div>
                  {total > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <Check size={11} style={{ color: n.cor }} />
                      <span className="text-[11px] text-[#8b949e]">{feitos}/{total} concluídos</span>
                    </div>
                  ) : (
                    n.texto && <p className="text-[11px] text-[#8b949e] line-clamp-3">{n.texto}</p>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {totalNotas > notasFixadas.length && (
          <button onClick={() => setActiveView('notas')} className="text-xs text-center" style={{ color: accent }}>
            + {totalNotas - Math.min(4, notasFixadas.length)} {totalNotas - notasFixadas.length === 1 ? 'nota' : 'notas'} no bloco completo
          </button>
        )}
      </div>
    </div>
  )
}
