import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Node, Edge } from '@xyflow/react'
import type {
  Project, QuickIdea, ProjectColor, ProjectIcon,
  ProjectType, KanbanCard, KanbanColumn, MindMapNodeData
} from './types'
import type {
  Empresa, Separacao, UsuarioPessoal,
  FluxoLancamento, Conta, Funcionario,
  Insumo, MovimentoEstoque, DREPeriodo,
  Entregador, RegistroEntrega, PagamentoEntregador,
} from './empresaTypes'
import { DEFAULT_CONFIG_ENTREGADORES, MARGEM_SEGURANCA_CARDAPIO, DEFAULT_CONFIG_PRECIFICACAO } from './empresaTypes'
import type {
  BancoState, ControleFinanceiro, ContaBancaria, Transacao,
  Transferencia, Recorrente, CategoriaFin, OrcamentoItem,
  Caixinha, MovimentoCaixinha, Cartao, GastoCartao,
} from './bancoTypes'
import { emptyBanco, emptyControle } from './bancoTypes'
import type { Nota } from './notasTypes'
import type { Objetivo, AporteReal } from './objetivoTypes'
import { patrimonioAlvo } from './objetivoTypes'
import { totalGuardado, progressoPercentual } from './objetivoSelectors'
import { buildProjecao } from '../pages/Simulador/math'

export type { Empresa, Separacao, FluxoLancamento, Conta, Funcionario, Insumo, MovimentoEstoque, DREPeriodo }
export type { Entregador, RegistroEntrega, PagamentoEntregador }
export type { Nota }
export type { BancoState, ControleFinanceiro, ContaBancaria, Transacao, Transferencia, Recorrente, CategoriaFin, OrcamentoItem }
export type { Caixinha, MovimentoCaixinha }
export type { Objetivo, AporteReal }

export type Perfil = 'pessoal' | 'empresa'

export interface NotifPrefs {
  ativo: boolean
  email: string
  antecedencias: number[]   // dias antes: ex [7,3,1,0]
  horario: string          // 'HH:MM'
  tipos: { contasEmpresa: boolean; despesasPessoais: boolean; aportes: boolean; impostos: boolean }
}

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  ativo: true,
  email: '',
  antecedencias: [7, 3, 1, 0],
  horario: '08:00',
  tipos: { contasEmpresa: true, despesasPessoais: true, aportes: false, impostos: false },
}

export type AppView =
  | 'dashboard' | 'projects' | 'editor' | 'kanban' | 'diary' | 'simulador'
  | 'empresa_dashboard' | 'empresa_dre' | 'empresa_fluxo'
  | 'empresa_pagar' | 'empresa_receber' | 'empresa_indicadores'
  | 'empresa_rh' | 'empresa_estoque' | 'empresa_entregadores' | 'empresa_fornecedores' | 'empresa_cardapio' | 'empresa_precificador' | 'empresa_cmv'
  | 'separacao' | 'notas'
  // Banking + financial control (work in both profiles)
  | 'contas' | 'conta_detalhe' | 'transacoes' | 'transferencias'
  | 'controle_financeiro' | 'cartoes'

/**
 * Perfil exigido por cada view, para o guard de isolamento:
 * - 'pessoal' / 'empresa': só acessível no respectivo perfil
 * - 'ambos': telas com escopo do perfil ativo (banco, controle) ou
 *   leitura consolidada (dashboard) + a ponte (separação)
 */
export const VIEW_PROFILE: Record<AppView, 'pessoal' | 'empresa' | 'ambos'> = {
  dashboard: 'ambos',
  separacao: 'ambos',
  contas: 'ambos',
  conta_detalhe: 'ambos',
  transacoes: 'ambos',
  transferencias: 'ambos',
  controle_financeiro: 'ambos',
  cartoes: 'ambos',
  projects: 'ambos',
  notas: 'ambos',
  // pessoais
  simulador: 'pessoal',
  diary: 'pessoal',
  editor: 'pessoal',
  kanban: 'pessoal',
  // empresariais
  empresa_dashboard: 'empresa',
  empresa_dre: 'empresa',
  empresa_fluxo: 'empresa',
  empresa_pagar: 'empresa',
  empresa_receber: 'empresa',
  empresa_indicadores: 'empresa',
  empresa_rh: 'empresa',
  empresa_estoque: 'empresa',
  empresa_entregadores: 'empresa',
  empresa_fornecedores: 'empresa',
  empresa_cardapio: 'empresa',
  empresa_precificador: 'empresa',
  empresa_cmv: 'empresa',
}

export function viewPermitida(view: AppView, perfil: Perfil): boolean {
  const req = VIEW_PROFILE[view]
  return req === 'ambos' || req === perfil
}

export interface SimParams { inicial: number; mensal: number; yieldAnual: number; meta: number }
export interface SimAlocacao { id: string; nome: string; percentual: number; cor: string }
export interface SimulacaoSalva {
  id: string; nome: string; descricao: string; dataCriacao: string
  parametros: { aporteInicial: number; aporteMensal: number; yieldAnual: number; metaMensal: number }
  resultados: {
    prazoMeses: number; patrimonioNecessario: number
    rendaEm1Ano: number; rendaEm3Anos: number; rendaEm5Anos: number
    tabelaAnual: ReturnType<typeof buildProjecao>
  }
  alocacao: { nome: string; percentual: number; cor: string }[]
  projetoId?: string
}
export type SimLabels = Record<string, string>

// ─── helpers ─────────────────────────────────────────────────────────────────
const nanoid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

function updEmpresa(empresas: Empresa[], id: string, fn: (e: Empresa) => Empresa): Empresa[] {
  return empresas.map(e => e.id === id ? fn(e) : e)
}

const DEFAULT_EMPRESA_METAS = { faturamento: 50000, lucro: 10000, cmvMax: 30, custosRHMax: 35 }

function newEmpresa(nome: string, setor: string): Empresa {
  return {
    id: nanoid(), nome, setor, cor: '#e8a020',
    logoInicial: nome.charAt(0).toUpperCase(),
    metas: DEFAULT_EMPRESA_METAS,
    dre: [], fluxoCaixa: [], contasPagar: [], contasReceber: [],
    funcionarios: [], insumos: [], movimentosEstoque: [],
    banco: emptyBanco(), controleFinanceiro: emptyControle(),
    centroCustos: [
      { area: 'Cozinha', cor: '#ef4444' },
      { area: 'Salão', cor: '#3b82f6' },
      { area: 'Delivery', cor: '#06b6d4' },
      { area: 'Administrativo', cor: '#a855f7' },
      { area: 'Marketing', cor: '#e879f9' },
    ],
  }
}

function advanceFreq(iso: string, freq: Recorrente['frequencia']): string {
  const d = new Date(iso)
  if (freq === 'diaria') d.setDate(d.getDate() + 1)
  else if (freq === 'semanal') d.setDate(d.getDate() + 7)
  else if (freq === 'mensal') d.setMonth(d.getMonth() + 1)
  else if (freq === 'anual') d.setFullYear(d.getFullYear() + 1)
  return d.toISOString()
}

// Gera mapa mental de um objetivo: centro + ramos (meta, ritmo, marcos)
function gerarObjetivoNodes(o: Objetivo, aportes: AporteReal[]): { nodes: Node<MindMapNodeData>[]; edges: Edge[] } {
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  const alvo = patrimonioAlvo(o)
  const guardado = totalGuardado(aportes, o.id)
  const pct = progressoPercentual(o, aportes)
  const BRANCHES = [
    { label: 'Minha Meta', color: '#1d9e75', children: [`Alvo: ${isFinite(alvo) ? fmt(alvo) : '∞'}`, o.tipo === 'renda' ? `Renda: ${fmt(o.valorAlvo)}/mês` : 'Patrimônio', `Yield: ${o.yieldAnual}% a.a.`] },
    { label: 'Meu Plano', color: '#378add', children: [`${fmt(o.valorPlanejado)} por ${o.frequencia}`, `Início: ${new Date(o.dataInicio).toLocaleDateString('pt-BR')}`] },
    { label: 'Progresso', color: '#9b59b6', children: [`Guardado: ${fmt(guardado)}`, `${pct.toFixed(0)}% atingido`, `Aportes: ${aportes.filter(a => a.objetivoId === o.id).length}`] },
    { label: 'Próximos Passos', color: '#e05252', children: ['Manter o ritmo', 'Aumentar aporte se possível', 'Revisar a cada marco'] },
  ]
  const nodes: Node<MindMapNodeData>[] = []
  const edges: Edge[] = []
  const cid = nanoid()
  nodes.push({ id: cid, type: 'mind', position: { x: 0, y: 0 }, data: { label: o.nome, nodeType: 'central', color: '#1d9e75', gerado: true } })
  BRANCHES.forEach((b, bi) => {
    const angle = ((-90 + bi * 90) * Math.PI) / 180
    const bx = Math.cos(angle) * 320, by = Math.sin(angle) * 320
    const bid = nanoid()
    nodes.push({ id: bid, type: 'mind', position: { x: bx, y: by }, data: { label: b.label, nodeType: 'topic', color: b.color, gerado: true } })
    edges.push({ id: `e-${cid}-${bid}`, source: cid, target: bid, type: 'smoothstep', style: { stroke: b.color, strokeWidth: 2.5 } })
    b.children.forEach((child, ci) => {
      const perp = angle + Math.PI / 2, off = (ci - (b.children.length - 1) / 2) * 70
      const chid = nanoid()
      nodes.push({ id: chid, type: 'mind', position: { x: bx + Math.cos(angle) * 220 + Math.cos(perp) * off, y: by + Math.sin(angle) * 220 + Math.sin(perp) * off }, data: { label: child, nodeType: 'subtopic', color: b.color, gerado: true } })
      edges.push({ id: `e-${bid}-${chid}`, source: bid, target: chid, type: 'smoothstep', style: { stroke: b.color, strokeWidth: 1.5 } })
    })
  })
  return { nodes, edges }
}

// Resolve and mutate the correct banco slice (pessoal root or active empresa)
type GetFn = () => AppState
type SetFn = (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void

// Garante que um banco persistido (possivelmente antigo) tenha todos os arrays
function normBanco(b?: BancoState): BancoState {
  const e = emptyBanco()
  if (!b) return e
  return {
    contas: b.contas ?? e.contas,
    transacoes: b.transacoes ?? e.transacoes,
    transferencias: b.transferencias ?? e.transferencias,
    recorrentes: b.recorrentes ?? e.recorrentes,
    caixinhas: b.caixinhas ?? e.caixinhas,
    movimentosCaixinha: b.movimentosCaixinha ?? e.movimentosCaixinha,
    cartoes: b.cartoes ?? e.cartoes,
    gastosCartao: b.gastosCartao ?? e.gastosCartao,
  }
}

// Data local YYYY-MM-DD (evita o deslocamento de fuso do toISOString, que usa UTC)
function hojeLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Detecta transações 'manual' que duplicam um pagamento/recebimento de conta
// (resíduo da migração antiga do fluxoCaixa, que rodava em dobro com a transação real).
// Retorna os ids das duplicatas 'manual' a remover. Cada conta_pagar/receber consome
// no máx. uma duplicata correspondente (mesma conta, tipo, valor e descrição).
function acharDuplicatasMigracao(transacoes: Transacao[]): string[] {
  const remover: string[] = []
  const usados = new Set<string>()
  const chave = (t: Transacao) => `${t.contaId}|${t.tipo}|${t.valor}|${t.descricao}`
  // agrupa as 'manual' por chave (candidatas a duplicata)
  const manuaisPorChave = new Map<string, Transacao[]>()
  transacoes.forEach(t => {
    if (t.origemAuto === 'manual' && !t.transferenciaId) {
      const k = chave(t)
      if (!manuaisPorChave.has(k)) manuaisPorChave.set(k, [])
      manuaisPorChave.get(k)!.push(t)
    }
  })
  transacoes.forEach(t => {
    if (t.origemAuto !== 'conta_pagar' && t.origemAuto !== 'conta_receber') return
    const cands = manuaisPorChave.get(chave(t))
    if (!cands) return
    const dup = cands.find(c => !usados.has(c.id))
    if (dup) { usados.add(dup.id); remover.push(dup.id) }
  })
  return remover
}

function setBanco(get: GetFn, set: SetFn, perfil: Perfil | undefined, fn: (b: BancoState) => BancoState) {
  const s = get()
  const p = perfil ?? s.perfilAtivo
  if (p === 'pessoal') {
    set({ bancoPessoal: fn(normBanco(s.bancoPessoal)) })
  } else {
    const empId = s.empresaAtivaId ?? s.empresas[0]?.id
    if (!empId) return
    set({
      empresas: s.empresas.map(e =>
        e.id === empId ? { ...e, banco: fn(normBanco(e.banco)) } : e
      ),
    })
  }
}

function setNotas(get: GetFn, set: SetFn, perfil: Perfil | undefined, fn: (list: Nota[]) => Nota[]) {
  const s = get()
  const p = perfil ?? s.perfilAtivo
  if (p === 'pessoal') {
    set({ notasPessoal: fn(s.notasPessoal ?? []) })
  } else {
    const empId = s.empresaAtivaId ?? s.empresas[0]?.id
    if (!empId) return
    set({ empresas: s.empresas.map(e => e.id === empId ? { ...e, notas: fn(e.notas ?? []) } : e) })
  }
}

function setControle(get: GetFn, set: SetFn, perfil: Perfil | undefined, fn: (c: ControleFinanceiro) => ControleFinanceiro) {
  const s = get()
  const p = perfil ?? s.perfilAtivo
  if (p === 'pessoal') {
    set({ controlePessoal: fn(s.controlePessoal ?? emptyControle()) })
  } else {
    const empId = s.empresaAtivaId ?? s.empresas[0]?.id
    if (!empId) return
    set({
      empresas: s.empresas.map(e =>
        e.id === empId ? { ...e, controleFinanceiro: fn(e.controleFinanceiro ?? emptyControle()) } : e
      ),
    })
  }
}

const DEFAULT_SEPARACAO: Separacao = {
  proLabore: 0, pctInvestimentos: 50, pctDespesas: 40, pctReserva: 10, historico: [],
}

// Mind map generator for simulacao export
function gerarMapaMentalNodes(sim: SimulacaoSalva): { nodes: Node<MindMapNodeData>[]; edges: Edge[] } {
  const toYM = (y: number) => (1 + y / 100) ** (1 / 12) - 1
  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  const fmtK = (v: number) => v >= 1e6 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v.toFixed(0)}`
  const fmtP = (m: number) => {
    if (!isFinite(m)) return '> 50 anos'
    const a = Math.floor(m / 12), r = m % 12
    return a === 0 ? `${r} meses` : r === 0 ? `${a} anos` : `${a} anos e ${r} meses`
  }
  const { aporteInicial: ini, aporteMensal: men, yieldAnual: ya, metaMensal: meta } = sim.parametros
  const ym = toYM(ya)
  const cap = ym > 0 ? meta / ym : Infinity

  const BRANCHES = [
    { label: 'Minha Meta', color: '#1d9e75', children: [`Meta: ${fmtBRL(meta)}/mês`, `Capital: ${isFinite(cap) ? fmtK(cap) : '∞'}`, `Prazo: ${fmtP(sim.resultados.prazoMeses)}`] },
    { label: 'Meus Aportes', color: '#378add', children: [`Inicial: ${fmtBRL(ini)}`, `Mensal: ${fmtBRL(men)}`, `Yield: ${ya}% a.a.`] },
    { label: 'Projeção', color: '#9b59b6', children: [`1 ano: ${fmtBRL(sim.resultados.rendaEm1Ano)}/mês`, `3 anos: ${fmtBRL(sim.resultados.rendaEm3Anos)}/mês`, `5 anos: ${fmtBRL(sim.resultados.rendaEm5Anos)}/mês`] },
    { label: 'Alocação', color: '#e8a020', children: sim.alocacao.map(a => `${a.nome}: ${a.percentual}%`) },
    { label: 'Próximos Passos', color: '#e05252', children: ['Abrir conta na corretora', 'Fazer primeiro aporte', 'Estudar os ativos'] },
  ]

  const nodes: Node<MindMapNodeData>[] = []
  const edges: Edge[] = []
  const cid = nanoid()
  nodes.push({ id: cid, type: 'mind', position: { x: 0, y: 0 }, data: { label: sim.nome, nodeType: 'central', color: '#1d9e75', gerado: true } })

  BRANCHES.forEach((b, bi) => {
    const angle = ((-90 + bi * 72) * Math.PI) / 180
    const bx = Math.cos(angle) * 320, by = Math.sin(angle) * 320
    const bid = nanoid()
    nodes.push({ id: bid, type: 'mind', position: { x: bx, y: by }, data: { label: b.label, nodeType: 'topic', color: b.color, gerado: true } })
    edges.push({ id: `e-${cid}-${bid}`, source: cid, target: bid, type: 'smoothstep', style: { stroke: b.color, strokeWidth: 2.5 } })
    b.children.forEach((child, ci) => {
      const perp = angle + Math.PI / 2, off = (ci - (b.children.length - 1) / 2) * 70
      const chid = nanoid()
      nodes.push({ id: chid, type: 'mind', position: { x: bx + Math.cos(angle) * 220 + Math.cos(perp) * off, y: by + Math.sin(angle) * 220 + Math.sin(perp) * off }, data: { label: child, nodeType: 'subtopic', color: b.color, gerado: true } })
      edges.push({ id: `e-${bid}-${chid}`, source: bid, target: chid, type: 'smoothstep', style: { stroke: b.color, strokeWidth: 1.5 } })
    })
  })
  return { nodes, edges }
}

// ─── Store interface ──────────────────────────────────────────────────────────
interface AppState {
  // Profile
  perfilAtivo: 'pessoal' | 'empresa'
  setPerfilAtivo: (p: 'pessoal' | 'empresa') => void

  // User
  usuario: UsuarioPessoal
  setUsuario: (u: Partial<UsuarioPessoal>) => void

  // Personal — Projects
  projects: Project[]
  createProject: (data: { title: string; description: string; color: ProjectColor; icon: ProjectIcon; type: ProjectType; origem?: 'manual' | 'simulador'; simulacaoId?: string }) => Project
  updateProject: (id: string, data: Partial<Project>) => void
  deleteProject: (id: string) => void
  updateProjectNodes: (id: string, nodes: Node<MindMapNodeData>[], edges: Edge[]) => void

  // Kanban
  addKanbanCard: (projectId: string, card: Omit<KanbanCard, 'id'>) => void
  updateKanbanCard: (projectId: string, cardId: string, data: Partial<KanbanCard>) => void
  moveKanbanCard: (projectId: string, cardId: string, column: KanbanColumn) => void
  deleteKanbanCard: (projectId: string, cardId: string) => void
  reorderKanbanCards: (projectId: string, cards: KanbanCard[]) => void

  // Quick Ideas
  quickIdeas: QuickIdea[]
  addQuickIdea: (text: string, tags?: string[]) => void
  updateQuickIdea: (id: string, data: Partial<QuickIdea>) => void
  deleteQuickIdea: (id: string) => void
  convertIdeaToProject: (ideaId: string, data: { title: string; description: string; color: ProjectColor; icon: ProjectIcon; type: ProjectType }) => void

  // Simulador
  simParams: SimParams
  simAlocacao: SimAlocacao[]
  simLabels: SimLabels
  simulacoesSalvas: SimulacaoSalva[]
  setSimParams: (p: Partial<SimParams>) => void
  setSimAlocacao: (list: SimAlocacao[]) => void
  setSimLabel: (key: string, value: string) => void
  salvarSimulacao: (nome: string, descricao: string) => SimulacaoSalva
  carregarSimulacao: (id: string) => void
  excluirSimulacao: (id: string) => void
  exportarParaMapaMental: (id: string) => string

  // Acompanhamento real — objetivos & aportes
  objetivos: Objetivo[]
  aportesReais: AporteReal[]
  criarObjetivo: (data: Omit<Objetivo, 'id' | 'criadoEm'>) => Objetivo
  atualizarObjetivo: (id: string, data: Partial<Objetivo>) => void
  excluirObjetivo: (id: string) => void
  definirObjetivoPrincipal: (id: string) => void
  registrarAporte: (data: Omit<AporteReal, 'id'>) => AporteReal
  atualizarAporte: (id: string, data: Partial<AporteReal>) => void
  excluirAporte: (id: string) => void
  exportarObjetivoMapaMental: (objetivoId: string) => string

  // Empresas
  empresas: Empresa[]
  empresaAtivaId: string | null
  getEmpresaAtiva: () => Empresa | null
  adicionarEmpresa: (dados: { nome: string; setor: string }) => void
  atualizarEmpresa: (id: string, dados: Partial<Omit<Empresa, 'id'>>) => void
  excluirEmpresa: (id: string) => void
  setEmpresaAtiva: (id: string) => void

  // DRE
  salvarDREPeriodo: (empresaId: string, periodo: DREPeriodo) => void

  // Fluxo de Caixa
  adicionarLancamento: (empresaId: string, l: Omit<FluxoLancamento, 'id'>) => void
  atualizarLancamento: (empresaId: string, id: string, data: Partial<FluxoLancamento>) => void
  excluirLancamento: (empresaId: string, id: string) => void
  /** Migra lançamentos antigos do fluxoCaixa (array órfão) para transações reais.
   *  Retorna nº migrados, 0 se nada, -1 se não há conta empresa para vincular. */
  migrarFluxoParaTransacoes: (empresaId: string) => number
  /** Conta quantas transações 'manual' duplicam um pagamento/recebimento de conta
   *  (resíduo da migração antiga). Não altera nada. */
  contarDuplicatasMigracao: (perfil?: Perfil) => number
  /** Remove as transações 'manual' que duplicam uma conta_pagar/conta_receber. Retorna nº removidas. */
  removerDuplicatasMigracao: (perfil?: Perfil) => number

  // Contas a Pagar
  adicionarContaPagar: (empresaId: string, c: Omit<Conta, 'id'>) => void
  atualizarContaPagar: (empresaId: string, id: string, data: Partial<Conta>) => void
  excluirContaPagar: (empresaId: string, id: string) => void

  // Contas a Receber
  adicionarContaReceber: (empresaId: string, c: Omit<Conta, 'id'>) => void
  atualizarContaReceber: (empresaId: string, id: string, data: Partial<Conta>) => void
  excluirContaReceber: (empresaId: string, id: string) => void

  // Funcionários
  adicionarFuncionario: (empresaId: string, f: Omit<Funcionario, 'id'>) => void
  atualizarFuncionario: (empresaId: string, id: string, data: Partial<Funcionario>) => void
  excluirFuncionario: (empresaId: string, id: string) => void

  // Estoque
  adicionarInsumo: (empresaId: string, i: Omit<Insumo, 'id'>) => void
  atualizarInsumo: (empresaId: string, id: string, data: Partial<Insumo>) => void
  excluirInsumo: (empresaId: string, id: string) => void
  adicionarMovimento: (empresaId: string, m: Omit<MovimentoEstoque, 'id'>) => void

  // Entregadores
  adicionarEntregador: (empresaId: string, e: Omit<Entregador, 'id' | 'criadoEm'>) => void
  atualizarEntregador: (empresaId: string, id: string, data: Partial<Entregador>) => void
  excluirEntregador: (empresaId: string, id: string) => void
  registrarEntrega: (empresaId: string, r: Omit<RegistroEntrega, 'id'>) => void
  excluirRegistroEntrega: (empresaId: string, id: string) => void
  pagarEntregador: (empresaId: string, pag: Omit<PagamentoEntregador, 'id' | 'status' | 'dataPagamento' | 'transacaoId'>) => void
  setConfigEntregadores: (empresaId: string, cfg: Partial<import('./empresaTypes').ConfigEntregadores>) => void

  // Fornecedores (empresa ativa)
  getFornecedores: () => import('./empresaTypes').Fornecedor[]
  adicionarFornecedor: (f: Omit<import('./empresaTypes').Fornecedor, 'id' | 'criadoEm'>) => import('./empresaTypes').Fornecedor
  atualizarFornecedor: (id: string, data: Partial<import('./empresaTypes').Fornecedor>) => void
  excluirFornecedor: (id: string) => void
  getGastosPorFornecedor: (de: string, ate: string) => { fornecedorId: string; nome: string; total: number; qtd: number }[]
  getHistoricoFornecedor: (fornecedorId: string) => Transacao[]
  getPagamentosPessoa: (pessoaId: string, de: string, ate: string) => Transacao[]

  // Cardápio (empresa ativa)
  getCardapio: () => import('./empresaTypes').ItemCardapio[]
  adicionarItemCardapio: (i: Omit<import('./empresaTypes').ItemCardapio, 'id' | 'criadoEm'>) => void
  atualizarItemCardapio: (id: string, data: Partial<import('./empresaTypes').ItemCardapio>) => void
  excluirItemCardapio: (id: string) => void
  /** Custo calculado do item (soma insumos × qtd) + margem de segurança 10%. */
  getCustoItemCardapio: (item: import('./empresaTypes').ItemCardapio) => number

  // Precificação / markup (empresa ativa)
  getConfigPrecificacao: () => import('./empresaTypes').ConfigPrecificacao
  setConfigPrecificacao: (cfg: Partial<import('./empresaTypes').ConfigPrecificacao>) => void
  /** % de custo fixo sobre venda = (fixos + pró-labore) / faturamento estimado. */
  getCustoFixoPct: () => number
  /** Divisor de markup (1 - cv% - lucro% - cf%); <= 0 = inviável. */
  getMarkupDivisor: () => number
  /** Preço sugerido para um custo de produto, pelo markup configurado. */
  getPrecoSugerido: (custo: number) => number

  // Cartões de crédito (perfil)
  adicionarCartao: (c: Omit<Cartao, 'id' | 'criadoEm'>, perfil?: Perfil) => void
  editarCartao: (id: string, data: Partial<Cartao>, perfil?: Perfil) => void
  excluirCartao: (id: string, perfil?: Perfil) => void
  adicionarGastoCartao: (g: Omit<GastoCartao, 'id' | 'criadoEm'>, perfil?: Perfil) => void
  excluirGastoCartao: (id: string, perfil?: Perfil) => void
  /** Gastos da fatura de um cartão no ciclo que fecha no mês/ano informado. */
  getFaturaCartao: (cartaoId: string, ano: number, mes: number, perfil?: Perfil) => { gastos: GastoCartao[]; total: number; inicio: string; fim: string; vencimento: string }
  /** Fatura em aberto (não paga) total do cartão. */
  getFaturaAberta: (cartaoId: string, perfil?: Perfil) => number
  /** Paga a fatura do ciclo: gera transação na conta vinculada e marca os gastos. */
  pagarFaturaCartao: (cartaoId: string, ano: number, mes: number, contaId: string, perfil?: Perfil) => void

  // Separação
  separacao: Separacao
  setSeparacao: (data: Partial<Separacao>) => void
  registrarProLabore: (valor: number, obs?: string) => void

  // ── Banco (pessoal lives at root; empresa lives inside Empresa) ──────────────
  bancoPessoal: BancoState
  controlePessoal: ControleFinanceiro
  ocultarSaldos: boolean
  setOcultarSaldos: (v: boolean) => void

  // resolve helpers
  getBanco: (perfil?: Perfil) => BancoState
  getControle: (perfil?: Perfil) => ControleFinanceiro

  // contas
  adicionarConta: (c: Omit<ContaBancaria, 'id' | 'criadoEm'>, perfil?: Perfil) => void
  editarConta: (id: string, data: Partial<ContaBancaria>, perfil?: Perfil) => void
  excluirConta: (id: string, perfil?: Perfil) => void
  /** Cria um lançamento de ajuste para o saldo da conta bater exatamente em saldoAlvo. */
  ajustarSaldoConta: (contaId: string, saldoAlvo: number, perfil?: Perfil) => void
  getSaldoConta: (contaId: string, perfil?: Perfil) => number
  getSaldoTotal: (perfil?: Perfil) => number

  // caixinhas
  criarCaixinha: (c: Omit<Caixinha, 'id' | 'criadoEm'>, depositoInicial?: number, perfil?: Perfil) => void
  editarCaixinha: (id: string, data: Partial<Caixinha>, perfil?: Perfil) => void
  excluirCaixinha: (id: string, perfil?: Perfil) => void
  depositarCaixinha: (caixinhaId: string, valor: number, data: string, obs?: string, perfil?: Perfil) => boolean
  retirarCaixinha: (caixinhaId: string, valor: number, data: string, obs?: string, perfil?: Perfil) => boolean
  transferirEntreCaixinhas: (origemId: string, destinoId: string, valor: number, data: string, obs?: string, perfil?: Perfil) => boolean
  getSaldoCaixinha: (caixinhaId: string, perfil?: Perfil) => number
  getSaldoReservado: (contaId: string, perfil?: Perfil) => number
  getSaldoLivreConta: (contaId: string, perfil?: Perfil) => number
  getProgressoCaixinha: (caixinhaId: string, perfil?: Perfil) => number
  getExtratoCaixinha: (caixinhaId: string, perfil?: Perfil) => MovimentoCaixinha[]

  // transações
  registrarTransacao: (t: Omit<Transacao, 'id'>, perfil?: Perfil) => Transacao
  editarTransacao: (id: string, data: Partial<Transacao>, perfil?: Perfil) => void
  excluirTransacao: (id: string, perfil?: Perfil) => void
  toggleConferida: (id: string, perfil?: Perfil) => void

  // transferências
  fazerTransferencia: (
    t: { contaOrigemId: string; contaDestinoId: string; valor: number; data: string; descricao: string; proLabore?: boolean },
    perfil?: Perfil
  ) => boolean
  estornarTransferencia: (id: string, perfil?: Perfil) => void

  // recorrentes
  adicionarRecorrente: (r: Omit<Recorrente, 'id'>, perfil?: Perfil) => void
  atualizarRecorrente: (id: string, data: Partial<Recorrente>, perfil?: Perfil) => void
  excluirRecorrente: (id: string, perfil?: Perfil) => void
  processarRecorrentes: () => void

  // controle financeiro
  setOrcamento: (orcamento: OrcamentoItem[], perfil?: Perfil) => void
  setReservaEmergencia: (valor: number, perfil?: Perfil) => void

  // ── Preferências de notificação ──────────────────────────────────────────────
  notifPrefs: NotifPrefs
  setNotifPrefs: (data: Partial<NotifPrefs>) => void
  avisosLidos: string[]   // ids de avisos dispensados in-app
  marcarAvisoLido: (id: string) => void

  // ── Bloco de Notas (isolado por perfil) ──────────────────────────────────────
  notasPessoal: Nota[]
  getNotas: (perfil?: Perfil) => Nota[]
  criarNota: (n: Omit<Nota, 'id' | 'criadaEm' | 'atualizadaEm'>, perfil?: Perfil) => Nota
  atualizarNota: (id: string, data: Partial<Nota>, perfil?: Perfil) => void
  excluirNota: (id: string, perfil?: Perfil) => void
  getLembretesProximos: (perfil?: Perfil) => Nota[]
  getNotasDoVinculo: (tipo: 'conta' | 'transacao' | 'modulo', id: string, perfil?: Perfil) => Nota[]
  converterNotaEmProjeto: (notaId: string, perfil?: Perfil) => Project | null

  // ── Selectors consolidados ──────────────────────────────────────────────────
  getReceitasMes: (mes: string, perfil?: Perfil) => number   // mes = 'YYYY-MM'
  getDespesasMes: (mes: string, perfil?: Perfil) => number
  getTaxaPoupanca: (mes: string, perfil?: Perfil) => number
  getRendaPassivaMensal: () => number
  getDespesasPessoaisMensais: () => number
  getPatrimonioTotal: () => number
  getValorEmpresa: () => number
  getRendaMensalTotal: () => number
  getIndependenciaFinanceira: () => number
  getProjecaoIndependencia: () => number
  // Consolidados (pessoal + todas as empresas)
  getPatrimonioLiquidoTotal: () => number
  getFluxoConsolidadoMes: (mes: string) => { entradas: number; saidas: number; saldo: number }
  getDadosGraficoMestre: (periodo: 6 | 12 | 24) => { label: string; pessoal: number; empresa: number; total: number }[]

  // IA — aprendizado de mapeamentos (estabelecimento → contexto/categoria)
  mapeamentos: { estabelecimento: string; contexto: 'pessoal' | 'empresa'; categoria: CategoriaFin; contagem: number }[]
  registrarMapeamento: (estabelecimento: string, contexto: 'pessoal' | 'empresa', categoria: CategoriaFin) => void

  // UI
  activeView: AppView
  activeProjectId: string | null
  activeContaId: string | null
  setActiveContaId: (id: string | null) => void
  setActiveView: (v: AppView) => void
  setActiveProject: (id: string | null) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      perfilAtivo: 'pessoal',
      setPerfilAtivo: (p) => set({ perfilAtivo: p }),

      usuario: { nome: 'Investidor' },
      setUsuario: (u) => set(s => ({ usuario: { ...s.usuario, ...u } })),

      // Projects
      projects: [],
      createProject: (data) => {
        const p: Project = {
          id: nanoid(), title: data.title, description: data.description, color: data.color,
          icon: data.icon, type: data.type, status: 'active',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          nodes: [], edges: [], kanbanCards: [],
          origem: data.origem ?? 'manual', simulacaoId: data.simulacaoId,
        }
        set(s => ({ projects: [...s.projects, p] }))
        return p
      },
      updateProject: (id, data) => set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p) })),
      deleteProject: (id) => set(s => ({ projects: s.projects.filter(p => p.id !== id) })),
      updateProjectNodes: (id, nodes, edges) => set(s => ({ projects: s.projects.map(p => p.id === id ? { ...p, nodes, edges, updatedAt: new Date().toISOString() } : p) })),

      // Kanban
      addKanbanCard: (projectId, card) => set(s => ({ projects: s.projects.map(p => p.id === projectId ? { ...p, kanbanCards: [...p.kanbanCards, { ...card, id: nanoid() }] } : p) })),
      updateKanbanCard: (projectId, cardId, data) => set(s => ({ projects: s.projects.map(p => p.id === projectId ? { ...p, kanbanCards: p.kanbanCards.map(c => c.id === cardId ? { ...c, ...data } : c) } : p) })),
      moveKanbanCard: (projectId, cardId, column) => get().updateKanbanCard(projectId, cardId, { column }),
      deleteKanbanCard: (projectId, cardId) => set(s => ({ projects: s.projects.map(p => p.id === projectId ? { ...p, kanbanCards: p.kanbanCards.filter(c => c.id !== cardId) } : p) })),
      reorderKanbanCards: (projectId, cards) => set(s => ({ projects: s.projects.map(p => p.id === projectId ? { ...p, kanbanCards: cards } : p) })),

      // Quick Ideas
      quickIdeas: [],
      addQuickIdea: (text, tags = []) => set(s => ({ quickIdeas: [{ id: nanoid(), text, tags, status: 'new', createdAt: new Date().toISOString() }, ...s.quickIdeas] })),
      updateQuickIdea: (id, data) => set(s => ({ quickIdeas: s.quickIdeas.map(i => i.id === id ? { ...i, ...data } : i) })),
      deleteQuickIdea: (id) => set(s => ({ quickIdeas: s.quickIdeas.filter(i => i.id !== id) })),
      convertIdeaToProject: (ideaId, data) => { const p = get().createProject(data); get().updateQuickIdea(ideaId, { status: 'processed', projectId: p.id }) },

      // Simulador
      simParams: { inicial: 0, mensal: 0, yieldAnual: 0, meta: 0 },
      simAlocacao: [
        { id: 'rf', nome: 'Renda Fixa (LCI/LCA)', percentual: 40, cor: '#10b981' },
        { id: 'fii', nome: 'FIIs', percentual: 35, cor: '#3b82f6' },
        { id: 'acoes', nome: 'Ações dividendos', percentual: 25, cor: '#f59e0b' },
      ],
      simLabels: {},
      simulacoesSalvas: [],
      setSimParams: (p) => set(s => ({ simParams: { ...s.simParams, ...p } })),
      setSimAlocacao: (list) => set({ simAlocacao: list }),
      setSimLabel: (key, value) => set(s => ({ simLabels: { ...s.simLabels, [key]: value } })),
      salvarSimulacao: (nome, descricao) => {
        const s = get()
        const { inicial: ini, mensal: men, yieldAnual: ya, meta } = s.simParams
        const ym = (1 + ya / 100) ** (1 / 12) - 1
        const calcP = (i: number, m: number, r: number, n: number) => r === 0 ? i + m * n : i * (1 + r) ** n + m * ((1 + r) ** n - 1) / r
        let prazo = Infinity
        for (let n = 1; n <= 600; n++) { if (calcP(ini, men, ym, n) * ym >= meta) { prazo = n; break } }
        const sim: SimulacaoSalva = {
          id: nanoid(), nome, descricao, dataCriacao: new Date().toISOString(),
          parametros: { aporteInicial: ini, aporteMensal: men, yieldAnual: ya, metaMensal: meta },
          resultados: {
            prazoMeses: prazo, patrimonioNecessario: ym > 0 ? meta / ym : Infinity,
            rendaEm1Ano: calcP(ini, men, ym, 12) * ym,
            rendaEm3Anos: calcP(ini, men, ym, 36) * ym,
            rendaEm5Anos: calcP(ini, men, ym, 60) * ym,
            tabelaAnual: buildProjecao(ini, men, ym, meta, 10),
          },
          alocacao: s.simAlocacao.map(a => ({ nome: a.nome, percentual: a.percentual, cor: a.cor })),
        }
        set(prev => ({ simulacoesSalvas: [sim, ...prev.simulacoesSalvas].slice(0, 10) }))
        return sim
      },
      carregarSimulacao: (id) => set(s => {
        const sim = s.simulacoesSalvas.find(x => x.id === id)
        if (!sim) return {}
        return { simParams: { inicial: sim.parametros.aporteInicial, mensal: sim.parametros.aporteMensal, yieldAnual: sim.parametros.yieldAnual, meta: sim.parametros.metaMensal } }
      }),
      excluirSimulacao: (id) => set(s => ({ simulacoesSalvas: s.simulacoesSalvas.filter(x => x.id !== id) })),

      // ── Acompanhamento real ──────────────────────────────────────────────────
      objetivos: [],
      aportesReais: [],
      criarObjetivo: (data) => {
        const o: Objetivo = { ...data, id: nanoid(), criadoEm: new Date().toISOString() }
        set(s => {
          // primeiro objetivo é sempre principal; se o novo for principal, desmarca os outros
          const ehPrincipal = o.principal || s.objetivos.length === 0
          const base = ehPrincipal ? s.objetivos.map(x => ({ ...x, principal: false })) : s.objetivos
          return { objetivos: [...base, { ...o, principal: ehPrincipal }] }
        })
        return o
      },
      atualizarObjetivo: (id, data) =>
        set(s => ({ objetivos: s.objetivos.map(o => o.id === id ? { ...o, ...data } : o) })),
      excluirObjetivo: (id) =>
        set(s => {
          const restantes = s.objetivos.filter(o => o.id !== id)
          // se excluiu o principal, promove o primeiro restante
          if (!restantes.some(o => o.principal) && restantes.length > 0) restantes[0] = { ...restantes[0], principal: true }
          return { objetivos: restantes, aportesReais: s.aportesReais.filter(a => a.objetivoId !== id) }
        }),
      definirObjetivoPrincipal: (id) =>
        set(s => ({ objetivos: s.objetivos.map(o => ({ ...o, principal: o.id === id })) })),
      registrarAporte: (data) => {
        const a: AporteReal = { ...data, id: nanoid() }
        set(s => ({ aportesReais: [...s.aportesReais, a] }))
        return a
      },
      atualizarAporte: (id, data) =>
        set(s => ({ aportesReais: s.aportesReais.map(a => a.id === id ? { ...a, ...data } : a) })),
      excluirAporte: (id) =>
        set(s => ({ aportesReais: s.aportesReais.filter(a => a.id !== id) })),
      exportarObjetivoMapaMental: (objetivoId) => {
        const s = get()
        const o = s.objetivos.find(x => x.id === objetivoId)
        if (!o) return ''
        const { nodes, edges } = gerarObjetivoNodes(o, s.aportesReais)
        const p: Project = {
          id: nanoid(), title: `Objetivo: ${o.nome}`, description: 'Acompanhamento de objetivo financeiro',
          color: '#1d9e75', icon: 'Target', type: 'planning', status: 'active',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          nodes, edges, kanbanCards: [], origem: 'simulador',
        }
        set(prev => ({ projects: [...prev.projects, p] }))
        return p.id
      },

      exportarParaMapaMental: (id) => {
        const s = get()
        const sim = s.simulacoesSalvas.find(x => x.id === id)
        if (!sim) return ''
        if (sim.projetoId) { const ex = s.projects.find(p => p.id === sim.projetoId); if (ex) return sim.projetoId }
        const { nodes, edges } = gerarMapaMentalNodes(sim)
        const p: Project = {
          id: nanoid(), title: sim.nome, description: sim.descricao || 'Simulação financeira',
          color: '#1d9e75', icon: 'TrendingUp', type: 'planning', status: 'active',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          nodes, edges, kanbanCards: [], origem: 'simulador', simulacaoId: id,
        }
        set(prev => ({ projects: [...prev.projects, p], simulacoesSalvas: prev.simulacoesSalvas.map(x => x.id === id ? { ...x, projetoId: p.id } : x) }))
        return p.id
      },

      // Empresas
      empresas: [newEmpresa('Minha Empresa', 'Restaurante')],
      empresaAtivaId: null,
      getEmpresaAtiva: () => { const s = get(); const id = s.empresaAtivaId ?? s.empresas[0]?.id; return s.empresas.find(e => e.id === id) ?? null },
      adicionarEmpresa: (dados) => { const e = newEmpresa(dados.nome, dados.setor); set(s => ({ empresas: [...s.empresas, e], empresaAtivaId: e.id })) },
      atualizarEmpresa: (id, dados) => set(s => ({ empresas: updEmpresa(s.empresas, id, e => ({ ...e, ...dados })) })),
      excluirEmpresa: (id) => set(s => ({ empresas: s.empresas.filter(e => e.id !== id) })),
      setEmpresaAtiva: (id) => set({ empresaAtivaId: id }),

      // DRE
      salvarDREPeriodo: (empresaId, periodo) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, dre: [...e.dre.filter(d => !(d.mes === periodo.mes && d.ano === periodo.ano)), periodo] })) })),

      // Fluxo
      adicionarLancamento: (empresaId, l) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, fluxoCaixa: [...e.fluxoCaixa, { ...l, id: nanoid() }] })) })),
      atualizarLancamento: (empresaId, id, data) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, fluxoCaixa: e.fluxoCaixa.map(l => l.id === id ? { ...l, ...data } : l) })) })),
      excluirLancamento: (empresaId, id) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, fluxoCaixa: e.fluxoCaixa.filter(l => l.id !== id) })) })),
      migrarFluxoParaTransacoes: (empresaId) => {
        const s = get()
        const emp = s.empresas.find(e => e.id === empresaId)
        const orfaos = emp?.fluxoCaixa ?? []
        if (!emp || orfaos.length === 0) return 0
        const banco = normBanco(emp.banco)
        const conta = banco.contas.find(c => c.contaPadrao) ?? banco.contas[0]
        if (!conta) return -1 // sem conta para vincular — não migra (evita perda)
        // mapeia categoria do fluxo (legado) → categoria unificada
        const catMap: Record<string, CategoriaFin> = { fornecedores: 'insumos' }
        const novas: Transacao[] = orfaos.map(l => ({
          id: nanoid(), contaId: conta.id, tipo: l.tipo, valor: l.valor,
          descricao: l.descricao || 'Lançamento migrado',
          categoria: (catMap[l.categoria] ?? l.categoria) as CategoriaFin,
          data: l.data, recorrente: false, origemAuto: 'manual',
        }))
        set(st => ({
          empresas: updEmpresa(st.empresas, empresaId, e => ({
            ...e,
            banco: { ...normBanco(e.banco), transacoes: [...normBanco(e.banco).transacoes, ...novas] },
            fluxoCaixa: [], // esvazia os órfãos: agora vivem como transações
          })),
        }))
        return novas.length
      },
      contarDuplicatasMigracao: (perfil) => acharDuplicatasMigracao(get().getBanco(perfil).transacoes).length,
      removerDuplicatasMigracao: (perfil) => {
        const ids = new Set(acharDuplicatasMigracao(get().getBanco(perfil).transacoes))
        if (ids.size === 0) return 0
        setBanco(get, set, perfil, b => ({ ...b, transacoes: b.transacoes.filter(t => !ids.has(t.id)) }))
        return ids.size
      },

      // Contas Pagar
      adicionarContaPagar: (empresaId, c) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, contasPagar: [...e.contasPagar, { ...c, id: nanoid() }] })) })),
      atualizarContaPagar: (empresaId, id, data) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, contasPagar: e.contasPagar.map(c => c.id === id ? { ...c, ...data } : c) })) })),
      excluirContaPagar: (empresaId, id) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, contasPagar: e.contasPagar.filter(c => c.id !== id) })) })),

      // Contas Receber
      adicionarContaReceber: (empresaId, c) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, contasReceber: [...e.contasReceber, { ...c, id: nanoid() }] })) })),
      atualizarContaReceber: (empresaId, id, data) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, contasReceber: e.contasReceber.map(c => c.id === id ? { ...c, ...data } : c) })) })),
      excluirContaReceber: (empresaId, id) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, contasReceber: e.contasReceber.filter(c => c.id !== id) })) })),

      // Funcionários
      adicionarFuncionario: (empresaId, f) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, funcionarios: [...e.funcionarios, { ...f, id: nanoid() }] })) })),
      atualizarFuncionario: (empresaId, id, data) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, funcionarios: e.funcionarios.map(f => f.id === id ? { ...f, ...data } : f) })) })),
      excluirFuncionario: (empresaId, id) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, funcionarios: e.funcionarios.filter(f => f.id !== id) })) })),

      // Estoque
      adicionarInsumo: (empresaId, i) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, insumos: [...e.insumos, { ...i, id: nanoid() }] })) })),
      atualizarInsumo: (empresaId, id, data) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, insumos: e.insumos.map(i => i.id === id ? { ...i, ...data } : i) })) })),
      excluirInsumo: (empresaId, id) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, insumos: e.insumos.filter(i => i.id !== id) })) })),
      adicionarMovimento: (empresaId, m) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, movimentosEstoque: [...e.movimentosEstoque, { ...m, id: nanoid() }] })) })),

      // ── Entregadores ─────────────────────────────────────────────────────────
      adicionarEntregador: (empresaId, ent) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, entregadores: [...(e.entregadores ?? []), { ...ent, id: nanoid(), criadoEm: new Date().toISOString() }] })) })),
      atualizarEntregador: (empresaId, id, data) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, entregadores: (e.entregadores ?? []).map(x => x.id === id ? { ...x, ...data } : x) })) })),
      excluirEntregador: (empresaId, id) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({
        ...e,
        entregadores: (e.entregadores ?? []).filter(x => x.id !== id),
        registrosEntrega: (e.registrosEntrega ?? []).filter(r => r.entregadorId !== id),
        pagamentosEntregador: (e.pagamentosEntregador ?? []).filter(p => p.entregadorId !== id),
      })) })),
      registrarEntrega: (empresaId, r) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, registrosEntrega: [...(e.registrosEntrega ?? []), { ...r, id: nanoid() }] })) })),
      excluirRegistroEntrega: (empresaId, id) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({ ...e, registrosEntrega: (e.registrosEntrega ?? []).filter(r => r.id !== id) })) })),
      pagarEntregador: (empresaId, pag) => {
        const s = get()
        const emp = s.empresas.find(e => e.id === empresaId)
        if (!emp) return
        const ent = (emp.entregadores ?? []).find(e => e.id === pag.entregadorId)
        // gera transação de saída na conta PJ escolhida (categoria folha / delivery)
        let transacaoId: string | undefined
        if (pag.contaId && pag.totalPago > 0) {
          const tx = s.registrarTransacao({
            contaId: pag.contaId, tipo: 'saida', valor: pag.totalPago,
            descricao: `Pagamento entregador${ent ? `: ${ent.nome}` : ''}`,
            categoria: 'folha', data: hojeLocal(),
            recorrente: false, origemAuto: 'manual',
            pessoaId: pag.entregadorId, pessoaTipo: 'entregador', semanaRef: pag.semanaInicio,
          }, 'empresa')
          transacaoId = tx.id
        }
        const pagamento: PagamentoEntregador = {
          ...pag, id: nanoid(), status: 'pago',
          dataPagamento: hojeLocal(), transacaoId,
        }
        set(prev => ({ empresas: updEmpresa(prev.empresas, empresaId, e => ({
          ...e,
          // remove pagamento anterior da mesma semana/entregador (re-pagamento) e adiciona o novo
          pagamentosEntregador: [
            ...(e.pagamentosEntregador ?? []).filter(p => !(p.entregadorId === pag.entregadorId && p.semanaInicio === pag.semanaInicio)),
            pagamento,
          ],
        })) }))
      },
      setConfigEntregadores: (empresaId, cfg) => set(s => ({ empresas: updEmpresa(s.empresas, empresaId, e => ({
        ...e,
        configEntregadores: { ...DEFAULT_CONFIG_ENTREGADORES, ...(e.configEntregadores ?? {}), ...cfg },
      })) })),

      // Fornecedores (empresa ativa)
      getFornecedores: () => get().getEmpresaAtiva()?.fornecedores ?? [],
      adicionarFornecedor: (f) => {
        const novo = { ...f, id: nanoid(), criadoEm: hojeLocal() }
        const s = get()
        const empId = s.empresaAtivaId ?? s.empresas[0]?.id
        if (empId) set(st => ({ empresas: updEmpresa(st.empresas, empId, e => ({
          ...e, fornecedores: [...(e.fornecedores ?? []), novo],
        })) }))
        return novo
      },
      atualizarFornecedor: (id, data) => {
        const s = get()
        const empId = s.empresaAtivaId ?? s.empresas[0]?.id
        if (!empId) return
        set(st => ({ empresas: updEmpresa(st.empresas, empId, e => ({
          ...e, fornecedores: (e.fornecedores ?? []).map(f => f.id === id ? { ...f, ...data } : f),
        })) }))
      },
      excluirFornecedor: (id) => {
        const s = get()
        const empId = s.empresaAtivaId ?? s.empresas[0]?.id
        if (!empId) return
        set(st => ({ empresas: updEmpresa(st.empresas, empId, e => ({
          ...e, fornecedores: (e.fornecedores ?? []).filter(f => f.id !== id),
        })) }))
      },
      getGastosPorFornecedor: (de, ate) => {
        const s = get()
        const forns = s.getEmpresaAtiva()?.fornecedores ?? []
        const nome = (id: string) => forns.find(f => f.id === id)?.nome ?? 'Sem fornecedor'
        const map = new Map<string, { total: number; qtd: number }>()
        s.getBanco('empresa').transacoes
          .filter(t => t.tipo === 'saida' && t.fornecedorId && t.categoria !== 'transferencia')
          .filter(t => t.data.slice(0, 10) >= de && t.data.slice(0, 10) <= ate)
          .forEach(t => {
            const cur = map.get(t.fornecedorId!) ?? { total: 0, qtd: 0 }
            cur.total += t.valor; cur.qtd++; map.set(t.fornecedorId!, cur)
          })
        return [...map.entries()]
          .map(([fornecedorId, v]) => ({ fornecedorId, nome: nome(fornecedorId), ...v }))
          .sort((a, b) => b.total - a.total)
      },
      getHistoricoFornecedor: (fornecedorId) =>
        get().getBanco('empresa').transacoes
          .filter(t => t.fornecedorId === fornecedorId)
          .sort((a, b) => b.data.localeCompare(a.data)),
      getPagamentosPessoa: (pessoaId, de, ate) =>
        get().getBanco('empresa').transacoes
          .filter(t => t.pessoaId === pessoaId && t.data.slice(0, 10) >= de && t.data.slice(0, 10) <= ate)
          .sort((a, b) => b.data.localeCompare(a.data)),

      // Cardápio (empresa ativa)
      getCardapio: () => get().getEmpresaAtiva()?.cardapio ?? [],
      adicionarItemCardapio: (i) => {
        const item = { ...i, id: nanoid(), criadoEm: hojeLocal() }
        const s = get(); const empId = s.empresaAtivaId ?? s.empresas[0]?.id
        if (empId) set(st => ({ empresas: updEmpresa(st.empresas, empId, e => ({ ...e, cardapio: [...(e.cardapio ?? []), item] })) }))
      },
      atualizarItemCardapio: (id, data) => {
        const s = get(); const empId = s.empresaAtivaId ?? s.empresas[0]?.id
        if (empId) set(st => ({ empresas: updEmpresa(st.empresas, empId, e => ({ ...e, cardapio: (e.cardapio ?? []).map(x => x.id === id ? { ...x, ...data } : x) })) }))
      },
      excluirItemCardapio: (id) => {
        const s = get(); const empId = s.empresaAtivaId ?? s.empresas[0]?.id
        if (empId) set(st => ({ empresas: updEmpresa(st.empresas, empId, e => ({ ...e, cardapio: (e.cardapio ?? []).filter(x => x.id !== id) })) }))
      },
      getCustoItemCardapio: (item) => {
        if (item.composicao.length === 0) return item.custoManual ?? 0
        const insumos = get().getEmpresaAtiva()?.insumos ?? []
        const base = item.composicao.reduce((s, c) => {
          const ins = insumos.find(i => i.id === c.insumoId)
          return s + (ins ? ins.custoUnitario * c.quantidade : 0)
        }, 0)
        return base * (1 + MARGEM_SEGURANCA_CARDAPIO)
      },

      // Precificação / markup
      getConfigPrecificacao: () => ({ ...DEFAULT_CONFIG_PRECIFICACAO, ...(get().getEmpresaAtiva()?.configPrecificacao ?? {}) }),
      setConfigPrecificacao: (cfg) => {
        const s = get(); const empId = s.empresaAtivaId ?? s.empresas[0]?.id
        if (empId) set(st => ({ empresas: updEmpresa(st.empresas, empId, e => ({
          ...e, configPrecificacao: { ...DEFAULT_CONFIG_PRECIFICACAO, ...(e.configPrecificacao ?? {}), ...cfg },
        })) }))
      },
      getCustoFixoPct: () => {
        const c = get().getConfigPrecificacao()
        if (c.faturamentoEstimado <= 0) return 0
        return ((c.custosFixosMensais + c.proLabore) / c.faturamentoEstimado) * 100
      },
      getMarkupDivisor: () => {
        const c = get().getConfigPrecificacao()
        const cf = get().getCustoFixoPct()
        return 1 - (c.despesasVariaveisPct + c.lucroDesejadoPct + cf) / 100
      },
      getPrecoSugerido: (custo) => {
        const div = get().getMarkupDivisor()
        if (div <= 0) return 0
        return custo / div
      },

      // ── Cartões de crédito ───────────────────────────────────────────────────
      adicionarCartao: (c, perfil) => setBanco(get, set, perfil, b => ({ ...b, cartoes: [...b.cartoes, { ...c, id: nanoid(), criadoEm: hojeLocal() }] })),
      editarCartao: (id, data, perfil) => setBanco(get, set, perfil, b => ({ ...b, cartoes: b.cartoes.map(c => c.id === id ? { ...c, ...data } : c) })),
      excluirCartao: (id, perfil) => setBanco(get, set, perfil, b => ({ ...b, cartoes: b.cartoes.filter(c => c.id !== id), gastosCartao: b.gastosCartao.filter(g => g.cartaoId !== id) })),
      adicionarGastoCartao: (g, perfil) => setBanco(get, set, perfil, b => ({ ...b, gastosCartao: [...b.gastosCartao, { ...g, id: nanoid(), criadoEm: hojeLocal() }] })),
      excluirGastoCartao: (id, perfil) => setBanco(get, set, perfil, b => ({ ...b, gastosCartao: b.gastosCartao.filter(g => g.id !== id) })),
      getFaturaCartao: (cartaoId, ano, mes, perfil) => {
        const b = get().getBanco(perfil)
        const cartao = b.cartoes.find(c => c.id === cartaoId)
        const fech = cartao?.diaFechamento ?? 1
        const venc = cartao?.diaVencimento ?? 10
        // ciclo: do dia seguinte ao fechamento do mês anterior até o fechamento do mês informado
        const pad = (n: number) => String(n).padStart(2, '0')
        const ultimoDia = (a: number, m: number) => new Date(a, m, 0).getDate()
        const fimDia = Math.min(fech, ultimoDia(ano, mes))
        const fim = `${ano}-${pad(mes)}-${pad(fimDia)}`
        const mAnt = mes === 1 ? 12 : mes - 1, aAnt = mes === 1 ? ano - 1 : ano
        const iniDia = Math.min(fech, ultimoDia(aAnt, mAnt))
        const iniBase = `${aAnt}-${pad(mAnt)}-${pad(iniDia)}`
        const inicio = (() => { const d = new Date(iniBase + 'T00:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) })()
        const vencDia = Math.min(venc, ultimoDia(ano, mes))
        const vencimento = `${ano}-${pad(mes)}-${pad(vencDia)}`
        const gastos = b.gastosCartao.filter(g => g.cartaoId === cartaoId && g.data.slice(0, 10) >= inicio && g.data.slice(0, 10) <= fim)
        return { gastos, total: gastos.reduce((s, g) => s + g.valor, 0), inicio, fim, vencimento }
      },
      getFaturaAberta: (cartaoId, perfil) =>
        get().getBanco(perfil).gastosCartao.filter(g => g.cartaoId === cartaoId && !g.faturaPagaEm).reduce((s, g) => s + g.valor, 0),
      pagarFaturaCartao: (cartaoId, ano, mes, contaId, perfil) => {
        const s = get()
        const fatura = s.getFaturaCartao(cartaoId, ano, mes, perfil)
        const pendentes = fatura.gastos.filter(g => !g.faturaPagaEm)
        const total = pendentes.reduce((sum, g) => sum + g.valor, 0)
        if (total <= 0 || !contaId) return
        const cartao = s.getBanco(perfil).cartoes.find(c => c.id === cartaoId)
        const tx = s.registrarTransacao({
          contaId, tipo: 'saida', valor: total, descricao: `Fatura ${cartao?.nome ?? 'cartão'}`,
          categoria: 'cartao', data: hojeLocal(), recorrente: false, origemAuto: 'manual',
        }, perfil)
        const ids = new Set(pendentes.map(g => g.id))
        setBanco(get, set, perfil, b => ({ ...b, gastosCartao: b.gastosCartao.map(g => ids.has(g.id) ? { ...g, faturaPagaEm: hojeLocal(), transacaoId: tx.id } : g) }))
      },

      // Separação
      separacao: DEFAULT_SEPARACAO,
      setSeparacao: (data) => set(s => ({ separacao: { ...s.separacao, ...data } })),
      registrarProLabore: (valor, obs) => {
        const now = new Date()
        set(s => ({ separacao: { ...s.separacao, historico: [...s.separacao.historico, { id: nanoid(), mes: now.getMonth() + 1, ano: now.getFullYear(), valor, observacao: obs }] } }))
      },

      // ── Banco ────────────────────────────────────────────────────────────────
      bancoPessoal: emptyBanco(),
      controlePessoal: emptyControle(),
      ocultarSaldos: false,
      setOcultarSaldos: (v) => set({ ocultarSaldos: v }),

      getBanco: (perfil) => {
        const s = get()
        const p = perfil ?? s.perfilAtivo
        if (p === 'pessoal') return normBanco(s.bancoPessoal)
        const emp = s.getEmpresaAtiva()
        return normBanco(emp?.banco)
      },
      getControle: (perfil) => {
        const s = get()
        const p = perfil ?? s.perfilAtivo
        if (p === 'pessoal') return s.controlePessoal
        const emp = s.getEmpresaAtiva()
        return emp?.controleFinanceiro ?? emptyControle()
      },

      adicionarConta: (c, perfil) => {
        const conta: ContaBancaria = { ...c, id: nanoid(), criadoEm: new Date().toISOString() }
        setBanco(get, set, perfil, b => ({
          ...b,
          contas: c.contaPadrao
            ? [...b.contas.map(x => ({ ...x, contaPadrao: false })), conta]
            : [...b.contas, conta],
        }))
      },
      editarConta: (id, data, perfil) => setBanco(get, set, perfil, b => ({
        ...b,
        contas: b.contas.map(c => {
          if (c.id !== id) return data.contaPadrao ? { ...c, contaPadrao: false } : c
          return { ...c, ...data }
        }),
      })),
      excluirConta: (id, perfil) => setBanco(get, set, perfil, b => ({
        ...b, contas: b.contas.filter(c => c.id !== id),
      })),

      getSaldoConta: (contaId, perfil) => {
        const b = get().getBanco(perfil)
        const conta = b.contas.find(c => c.id === contaId)
        if (!conta) return 0
        const delta = b.transacoes.filter(t => t.contaId === contaId)
          .reduce((sum, t) => sum + (t.tipo === 'entrada' ? t.valor : -t.valor), 0)
        return conta.saldoInicial + delta
      },
      ajustarSaldoConta: (contaId, saldoAlvo, perfil) => {
        const s = get()
        const atual = s.getSaldoConta(contaId, perfil)
        const diff = Math.round((saldoAlvo - atual) * 100) / 100
        if (Math.abs(diff) < 0.01) return
        s.registrarTransacao({
          contaId, tipo: diff > 0 ? 'entrada' : 'saida', valor: Math.abs(diff),
          descricao: 'Ajuste de saldo', categoria: diff > 0 ? 'outros_entrada' : 'outros_saida',
          data: hojeLocal(), recorrente: false, origemAuto: 'manual',
        }, perfil)
      },
      getSaldoTotal: (perfil) => {
        const s = get()
        const b = s.getBanco(perfil)
        return b.contas.reduce((sum, c) => sum + s.getSaldoConta(c.id, perfil), 0)
      },

      // ── Caixinhas ────────────────────────────────────────────────────────────
      getSaldoCaixinha: (caixinhaId, perfil) => {
        const b = get().getBanco(perfil)
        return b.movimentosCaixinha.reduce((sum, m) => {
          if (m.caixinhaId === caixinhaId) {
            if (m.tipo === 'deposito') return sum + m.valor
            if (m.tipo === 'retirada') return sum - m.valor
            if (m.tipo === 'transferencia') return sum - m.valor // saiu desta caixinha
          }
          // transferência recebida
          if (m.tipo === 'transferencia' && m.caixinhaDestinoId === caixinhaId) return sum + m.valor
          return sum
        }, 0)
      },
      getSaldoReservado: (contaId, perfil) => {
        const s = get()
        const b = s.getBanco(perfil)
        return b.caixinhas.filter(c => c.contaId === contaId)
          .reduce((sum, c) => sum + s.getSaldoCaixinha(c.id, perfil), 0)
      },
      getSaldoLivreConta: (contaId, perfil) => {
        const s = get()
        return s.getSaldoConta(contaId, perfil) - s.getSaldoReservado(contaId, perfil)
      },
      getProgressoCaixinha: (caixinhaId, perfil) => {
        const s = get()
        const b = s.getBanco(perfil)
        const cx = b.caixinhas.find(c => c.id === caixinhaId)
        if (!cx?.meta || cx.meta <= 0) return 0
        return Math.min(100, (s.getSaldoCaixinha(caixinhaId, perfil) / cx.meta) * 100)
      },
      getExtratoCaixinha: (caixinhaId, perfil) => {
        const b = get().getBanco(perfil)
        return b.movimentosCaixinha
          .filter(m => m.caixinhaId === caixinhaId || m.caixinhaDestinoId === caixinhaId)
          .sort((a, b2) => b2.data.localeCompare(a.data))
      },
      criarCaixinha: (c, depositoInicial, perfil) => {
        const id = nanoid()
        const cx: Caixinha = { ...c, id, criadoEm: new Date().toISOString() }
        setBanco(get, set, perfil, b => ({ ...b, caixinhas: [...b.caixinhas, cx] }))
        if (depositoInicial && depositoInicial > 0) {
          get().depositarCaixinha(id, depositoInicial, hojeLocal(), 'Depósito inicial', perfil)
        }
      },
      editarCaixinha: (id, data, perfil) => setBanco(get, set, perfil, b => ({
        ...b, caixinhas: b.caixinhas.map(c => c.id === id ? { ...c, ...data } : c),
      })),
      excluirCaixinha: (id, perfil) => setBanco(get, set, perfil, b => ({
        // remove a caixinha e seus movimentos; o saldo volta automaticamente ao livre
        ...b,
        caixinhas: b.caixinhas.filter(c => c.id !== id),
        movimentosCaixinha: b.movimentosCaixinha.filter(m => m.caixinhaId !== id && m.caixinhaDestinoId !== id),
      })),
      depositarCaixinha: (caixinhaId, valor, data, obs, perfil) => {
        const s = get()
        const b = s.getBanco(perfil)
        const cx = b.caixinhas.find(c => c.id === caixinhaId)
        if (!cx || valor <= 0) return false
        // validação: não pode guardar mais que o saldo livre da conta
        if (valor > s.getSaldoLivreConta(cx.contaId, perfil) + 0.001) return false
        const mov: MovimentoCaixinha = { id: nanoid(), caixinhaId, tipo: 'deposito', valor, data, observacao: obs }
        setBanco(get, set, perfil, bb => ({ ...bb, movimentosCaixinha: [...bb.movimentosCaixinha, mov] }))
        return true
      },
      retirarCaixinha: (caixinhaId, valor, data, obs, perfil) => {
        const s = get()
        if (valor <= 0 || valor > s.getSaldoCaixinha(caixinhaId, perfil) + 0.001) return false
        const mov: MovimentoCaixinha = { id: nanoid(), caixinhaId, tipo: 'retirada', valor, data, observacao: obs }
        setBanco(get, set, perfil, bb => ({ ...bb, movimentosCaixinha: [...bb.movimentosCaixinha, mov] }))
        return true
      },
      transferirEntreCaixinhas: (origemId, destinoId, valor, data, obs, perfil) => {
        const s = get()
        if (origemId === destinoId || valor <= 0) return false
        if (valor > s.getSaldoCaixinha(origemId, perfil) + 0.001) return false
        const mov: MovimentoCaixinha = { id: nanoid(), caixinhaId: origemId, tipo: 'transferencia', valor, data, observacao: obs, caixinhaDestinoId: destinoId }
        setBanco(get, set, perfil, bb => ({ ...bb, movimentosCaixinha: [...bb.movimentosCaixinha, mov] }))
        return true
      },

      registrarTransacao: (t, perfil) => {
        const tx: Transacao = { ...t, id: nanoid() }
        setBanco(get, set, perfil, b => ({ ...b, transacoes: [...b.transacoes, tx] }))
        return tx
      },
      editarTransacao: (id, data, perfil) => setBanco(get, set, perfil, b => ({
        ...b, transacoes: b.transacoes.map(t => t.id === id ? { ...t, ...data } : t),
      })),
      excluirTransacao: (id, perfil) => setBanco(get, set, perfil, b => ({
        ...b, transacoes: b.transacoes.filter(t => t.id !== id),
      })),
      toggleConferida: (id, perfil) => setBanco(get, set, perfil, b => ({
        ...b, transacoes: b.transacoes.map(t => t.id === id ? { ...t, conferida: !t.conferida } : t),
      })),

      fazerTransferencia: (t, perfil) => {
        const s = get()
        const saldoOrigem = s.getSaldoConta(t.contaOrigemId, perfil)
        if (saldoOrigem < t.valor) return false
        const transferenciaId = nanoid()
        const txOut: Transacao = {
          id: nanoid(), contaId: t.contaOrigemId, tipo: 'saida', valor: t.valor,
          descricao: t.descricao || 'Transferência', categoria: 'transferencia',
          data: t.data, recorrente: false, transferenciaId,
        }
        const txIn: Transacao = {
          id: nanoid(), contaId: t.contaDestinoId, tipo: 'entrada', valor: t.valor,
          descricao: t.descricao || 'Transferência', categoria: 'transferencia',
          data: t.data, recorrente: false, transferenciaId,
        }
        const transf: Transferencia = {
          id: transferenciaId, contaOrigemId: t.contaOrigemId, contaDestinoId: t.contaDestinoId,
          valor: t.valor, data: t.data, descricao: t.descricao,
          transacaoOrigemId: txOut.id, transacaoDestinoId: txIn.id, proLabore: t.proLabore,
        }
        setBanco(get, set, perfil, b => ({
          ...b,
          transacoes: [...b.transacoes, txOut, txIn],
          transferencias: [...b.transferencias, transf],
        }))
        return true
      },
      estornarTransferencia: (id, perfil) => setBanco(get, set, perfil, b => {
        const transf = b.transferencias.find(x => x.id === id)
        if (!transf) return b
        return {
          ...b,
          transacoes: b.transacoes.filter(t => t.id !== transf.transacaoOrigemId && t.id !== transf.transacaoDestinoId),
          transferencias: b.transferencias.filter(x => x.id !== id),
        }
      }),

      adicionarRecorrente: (r, perfil) => setBanco(get, set, perfil, b => ({
        ...b, recorrentes: [...b.recorrentes, { ...r, id: nanoid() }],
      })),
      atualizarRecorrente: (id, data, perfil) => setBanco(get, set, perfil, b => ({
        ...b, recorrentes: b.recorrentes.map(r => r.id === id ? { ...r, ...data } : r),
      })),
      excluirRecorrente: (id, perfil) => setBanco(get, set, perfil, b => ({
        ...b, recorrentes: b.recorrentes.filter(r => r.id !== id),
      })),
      processarRecorrentes: () => {
        const hoje = hojeLocal()
        const perfis: Perfil[] = ['pessoal', 'empresa']
        perfis.forEach(perfil => {
          setBanco(get, set, perfil, b => {
            let novasTx: Transacao[] = []
            const recorrentes = b.recorrentes.map(r => {
              if (!r.ativo) return r
              let prox = r.proximaData
              let guard = 0
              while (prox.slice(0, 10) <= hoje && guard < 60) {
                novasTx.push({
                  id: nanoid(), contaId: r.contaId, tipo: r.tipo, valor: r.valor,
                  descricao: r.descricao, categoria: r.categoria, data: prox,
                  recorrente: true,
                })
                prox = advanceFreq(prox, r.frequencia)
                guard++
              }
              return { ...r, proximaData: prox }
            })
            if (novasTx.length === 0) return b
            return { ...b, transacoes: [...b.transacoes, ...novasTx], recorrentes }
          })
        })
      },

      setOrcamento: (orcamento, perfil) => setControle(get, set, perfil, c => ({ ...c, orcamento })),
      setReservaEmergencia: (valor, perfil) => setControle(get, set, perfil, c => ({ ...c, reservaEmergencia: valor })),

      // ── Preferências de notificação ──────────────────────────────────────────
      notifPrefs: DEFAULT_NOTIF_PREFS,
      setNotifPrefs: (data) => set(s => ({ notifPrefs: { ...s.notifPrefs, ...data } })),
      avisosLidos: [],
      marcarAvisoLido: (id) => set(s => ({ avisosLidos: s.avisosLidos.includes(id) ? s.avisosLidos : [...s.avisosLidos, id] })),

      // ── Bloco de Notas ────────────────────────────────────────────────────────
      notasPessoal: [],
      getNotas: (perfil) => {
        const s = get()
        const p = perfil ?? s.perfilAtivo
        if (p === 'pessoal') return s.notasPessoal ?? []
        const emp = s.getEmpresaAtiva()
        return emp?.notas ?? []
      },
      criarNota: (n, perfil) => {
        const now = new Date().toISOString()
        const nota: Nota = { ...n, id: nanoid(), criadaEm: now, atualizadaEm: now }
        setNotas(get, set, perfil, list => [nota, ...list])
        return nota
      },
      atualizarNota: (id, data, perfil) =>
        setNotas(get, set, perfil, list => list.map(x => x.id === id ? { ...x, ...data, atualizadaEm: new Date().toISOString() } : x)),
      excluirNota: (id, perfil) =>
        setNotas(get, set, perfil, list => list.filter(x => x.id !== id)),
      getLembretesProximos: (perfil) => {
        const notas = get().getNotas(perfil)
        return notas
          .filter(n => n.tipo === 'lembrete' && n.dataLembrete && !n.lembreteResolvido && !n.arquivada)
          .sort((a, b) => (a.dataLembrete ?? '').localeCompare(b.dataLembrete ?? ''))
      },
      getNotasDoVinculo: (tipo, id, perfil) =>
        get().getNotas(perfil).filter(n => !n.arquivada && n.vinculo?.tipo === tipo && n.vinculo?.id === id),
      converterNotaEmProjeto: (notaId, perfil) => {
        const nota = get().getNotas(perfil).find(n => n.id === notaId)
        if (!nota) return null
        const p = get().createProject({
          title: nota.titulo || nota.texto.slice(0, 40) || 'Nota',
          description: nota.tipo === 'checklist' ? '' : nota.texto,
          color: nota.cor, icon: 'Brain', type: 'planning', origem: 'manual',
        })
        // itens de checklist viram cards no kanban (coluna "todo")
        const itens = nota.itensChecklist ?? []
        itens.forEach(it => get().addKanbanCard(p.id, {
          title: it.texto, priority: 'medium', tags: nota.tags,
          checklist: [], column: it.feito ? 'done' : 'todo',
        }))
        // marca a nota como vinculada ao projeto e arquiva
        get().atualizarNota(notaId, { vinculo: { tipo: 'modulo', id: p.id, label: 'Mapa Mental' }, arquivada: true }, perfil)
        return p
      },

      // ── Selectors consolidados ──────────────────────────────────────────────
      getReceitasMes: (mes, perfil) => {
        const b = get().getBanco(perfil)
        return b.transacoes
          .filter(t => t.tipo === 'entrada' && t.categoria !== 'transferencia' && t.data.slice(0, 7) === mes)
          .reduce((s, t) => s + t.valor, 0)
      },
      getDespesasMes: (mes, perfil) => {
        const b = get().getBanco(perfil)
        return b.transacoes
          .filter(t => t.tipo === 'saida' && t.categoria !== 'transferencia' && t.data.slice(0, 7) === mes)
          .reduce((s, t) => s + t.valor, 0)
      },
      getTaxaPoupanca: (mes, perfil) => {
        const r = get().getReceitasMes(mes, perfil)
        const d = get().getDespesasMes(mes, perfil)
        if (r <= 0) return 0
        return ((r - d) / r) * 100
      },
      getRendaPassivaMensal: () => {
        // dividendos do mês corrente + projeção do simulador (renda atual estimada)
        const s = get()
        const mes = new Date().toISOString().slice(0, 7)
        const dividendos = s.bancoPessoal.transacoes
          .filter(t => t.categoria === 'dividendos' && t.data.slice(0, 7) === mes)
          .reduce((sum, t) => sum + t.valor, 0)
        const ym = (1 + s.simParams.yieldAnual / 100) ** (1 / 12) - 1
        const rendaSimulada = s.simParams.inicial * ym
        return Math.max(dividendos, rendaSimulada)
      },
      getDespesasPessoaisMensais: () => {
        const s = get()
        const mes = new Date().toISOString().slice(0, 7)
        const real = s.getDespesasMes(mes, 'pessoal')
        return real > 0 ? real : s.controlePessoal.orcamento.reduce((sum, o) => sum + o.limite, 0)
      },
      getValorEmpresa: () => {
        const s = get()
        return s.empresas.reduce((sum, e) => {
          const estoque = (e.insumos ?? []).reduce((x, i) => x + i.estoqueAtual * i.custoUnitario, 0)
          const caixa = (e.banco?.contas ?? []).reduce((x, c) => {
            const delta = (e.banco?.transacoes ?? [])
              .filter(t => t.contaId === c.id)
              .reduce((d, t) => d + (t.tipo === 'entrada' ? t.valor : -t.valor), 0)
            return x + c.saldoInicial + delta
          }, 0)
          return sum + estoque + caixa
        }, 0)
      },
      getPatrimonioTotal: () => {
        const s = get()
        const investido = s.simParams.inicial
        const reserva = s.controlePessoal.reservaEmergencia
        const saldosPessoais = s.getSaldoTotal('pessoal')
        const empresa = s.getValorEmpresa()
        return investido + reserva + saldosPessoais + empresa
      },
      getRendaMensalTotal: () => {
        const s = get()
        const rendaPassiva = s.getRendaPassivaMensal()
        // lucro distribuível: faturamento - custos do mês (empresa ativa)
        const emp = s.getEmpresaAtiva()
        const mes = new Date().toISOString().slice(0, 7)
        let lucro = 0
        if (emp?.banco) {
          const ent = emp.banco.transacoes.filter(t => t.tipo === 'entrada' && t.categoria !== 'transferencia' && t.data.slice(0, 7) === mes).reduce((x, t) => x + t.valor, 0)
          const sai = emp.banco.transacoes.filter(t => t.tipo === 'saida' && t.categoria !== 'transferencia' && t.data.slice(0, 7) === mes).reduce((x, t) => x + t.valor, 0)
          lucro = Math.max(0, ent - sai)
        }
        return rendaPassiva + lucro
      },
      getIndependenciaFinanceira: () => {
        const s = get()
        const despesas = s.getDespesasPessoaisMensais()
        if (despesas <= 0) return 0
        return (s.getRendaPassivaMensal() / despesas) * 100
      },
      getProjecaoIndependencia: () => {
        const s = get()
        const despesas = s.getDespesasPessoaisMensais()
        if (despesas <= 0) return 0
        const { inicial, mensal, yieldAnual } = s.simParams
        const ym = (1 + yieldAnual / 100) ** (1 / 12) - 1
        if (ym <= 0) return Infinity
        const jaCobre = inicial * ym >= despesas
        if (jaCobre) return 0
        for (let n = 1; n <= 600; n++) {
          const pat = inicial * (1 + ym) ** n + mensal * ((1 + ym) ** n - 1) / ym
          if (pat * ym >= despesas) return n
        }
        return Infinity
      },

      // ── Consolidados (pessoal + TODAS as empresas) ──────────────────────────
      getPatrimonioLiquidoTotal: () => {
        const s = get()
        const investido = s.simParams.inicial
        const reserva = s.controlePessoal?.reservaEmergencia ?? 0
        const saldoPessoal = s.getSaldoTotal('pessoal')
        // soma saldos bancários + estoque de todas as empresas
        const empresaTotal = s.empresas.reduce((sum, e) => {
          const estoque = (e.insumos ?? []).reduce((x, i) => x + i.estoqueAtual * i.custoUnitario, 0)
          const caixa = (e.banco?.contas ?? []).reduce((x, c) => {
            const delta = (e.banco?.transacoes ?? [])
              .filter(t => t.contaId === c.id)
              .reduce((d, t) => d + (t.tipo === 'entrada' ? t.valor : -t.valor), 0)
            return x + c.saldoInicial + delta
          }, 0)
          return sum + estoque + caixa
        }, 0)
        return investido + reserva + saldoPessoal + empresaTotal
      },
      getFluxoConsolidadoMes: (mes) => {
        const s = get()
        // pessoal
        const entP = s.getReceitasMes(mes, 'pessoal')
        const saiP = s.getDespesasMes(mes, 'pessoal')
        // todas as empresas
        let entE = 0, saiE = 0
        s.empresas.forEach(e => {
          const txs = e.banco?.transacoes ?? []
          txs.filter(t => t.categoria !== 'transferencia' && t.data.slice(0, 7) === mes).forEach(t => {
            if (t.tipo === 'entrada') entE += t.valor
            else saiE += t.valor
          })
        })
        const entradas = entP + entE
        const saidas = saiP + saiE
        return { entradas, saidas, saldo: entradas - saidas }
      },
      getDadosGraficoMestre: (periodo) => {
        const s = get()
        const now = new Date()
        const arr: { label: string; pessoal: number; empresa: number; total: number }[] = []
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        for (let i = periodo - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          const pessoal = Math.max(0, s.getReceitasMes(key, 'pessoal') - s.getDespesasMes(key, 'pessoal'))
          // soma de todas as empresas no mês
          let entE = 0, saiE = 0
          s.empresas.forEach(e => {
            (e.banco?.transacoes ?? []).filter(t => t.categoria !== 'transferencia' && t.data.slice(0, 7) === key).forEach(t => {
              if (t.tipo === 'entrada') entE += t.valor; else saiE += t.valor
            })
          })
          const empresa = Math.max(0, entE - saiE)
          const label = periodo > 12 ? `${meses[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` : meses[d.getMonth()]
          arr.push({ label, pessoal, empresa, total: pessoal + empresa })
        }
        return arr
      },

      // ── IA — mapeamentos aprendidos ─────────────────────────────────────────
      mapeamentos: [],
      registrarMapeamento: (estabelecimento, contexto, categoria) => {
        const nome = estabelecimento.trim().toLowerCase()
        if (!nome) return
        set(s => {
          const existente = s.mapeamentos.find(m => m.estabelecimento === nome)
          if (existente) {
            return {
              mapeamentos: s.mapeamentos.map(m =>
                m.estabelecimento === nome ? { ...m, contexto, categoria, contagem: m.contagem + 1 } : m
              ),
            }
          }
          return { mapeamentos: [...s.mapeamentos, { estabelecimento: nome, contexto, categoria, contagem: 1 }] }
        })
      },

      // UI
      activeView: 'dashboard',
      activeProjectId: null,
      activeContaId: null,
      setActiveContaId: (id) => set({ activeContaId: id }),
      setActiveView: (v) => set({ activeView: v }),
      setActiveProject: (id) => set({ activeProjectId: id }),
    }),
    { name: 'finance_pro_state' }
  )
)
