// Banking & financial-control types for the multi-profile Finance Pro store

export type ContaTipo =
  | 'corrente' | 'poupanca' | 'digital' | 'dinheiro'
  | 'cartao_credito' | 'investimentos' | 'outro'

export type BancoNome =
  | 'Nubank' | 'Itaú' | 'Bradesco' | 'Banco do Brasil' | 'Caixa'
  | 'Santander' | 'Inter' | 'C6' | 'PicPay' | 'Outro'

export type TransacaoTipo = 'entrada' | 'saida'

export type Frequencia = 'diaria' | 'semanal' | 'mensal' | 'anual'

// Unified categories shared between bank + financial control
export type CategoriaFin =
  // Receitas / entradas
  | 'salario' | 'pro_labore' | 'dividendos' | 'freelance' | 'alugueis'
  | 'vendas_balcao' | 'delivery' | 'eventos' | 'outros_entrada'
  // Despesas / saídas
  | 'moradia' | 'alimentacao' | 'transporte' | 'saude' | 'educacao'
  | 'lazer' | 'assinaturas' | 'cartao'
  | 'insumos' | 'folha' | 'aluguel' | 'utilidades' | 'marketing'
  | 'impostos' | 'manutencao'
  | 'outros_saida'
  // Transfer marker
  | 'transferencia'

// ── Conta bancária ──────────────────────────────────────────────────────────
export interface ContaBancaria {
  id: string
  nome: string
  tipo: ContaTipo
  banco: BancoNome
  saldoInicial: number
  cor: string
  contaPadrao: boolean
  observacoes?: string
  saldoMinimo?: number
  criadoEm: string
}

// ── Transação ───────────────────────────────────────────────────────────────
export interface Transacao {
  id: string
  contaId: string
  tipo: TransacaoTipo
  valor: number
  descricao: string
  categoria: CategoriaFin
  data: string // ISO
  recorrente: boolean
  transferenciaId?: string // set when part of a transfer (not income/expense)
  conferida?: boolean
  comprovante?: string
  observacoes?: string
  fornecedor?: string      // nome do fornecedor (snapshot) — ex: "Atacadão"
  fornecedorId?: string    // vínculo com cadastro de fornecedor
  pessoaId?: string        // vínculo com funcionário ou entregador (pagamento de pessoal)
  pessoaTipo?: 'funcionario' | 'entregador'
  competencia?: string     // mês de competência YYYY-MM (folha)
  semanaRef?: string       // semana de referência (entregadores) — ISO do início
  origemAuto?: 'conta_pagar' | 'conta_receber' | 'pro_labore' | 'manual'
}

// ── Transferência ───────────────────────────────────────────────────────────
export interface Transferencia {
  id: string
  contaOrigemId: string
  contaDestinoId: string
  valor: number
  data: string
  descricao: string
  transacaoOrigemId: string
  transacaoDestinoId: string
  proLabore?: boolean // special transfer empresa -> pessoal
}

// ── Recorrente ──────────────────────────────────────────────────────────────
export interface Recorrente {
  id: string
  contaId: string
  tipo: TransacaoTipo
  valor: number
  descricao: string
  categoria: CategoriaFin
  frequencia: Frequencia
  proximaData: string // ISO
  ativo: boolean
}

// ── Caixinhas (estilo Nubank) ─────────────────────────────────────────────────
export interface Caixinha {
  id: string
  contaId: string
  nome: string
  icone: string          // nome do ícone Lucide
  cor: string
  meta?: number          // valor alvo opcional
  dataAlvo?: string      // ISO opcional
  rende: boolean
  rendimentoAnual?: number
  objetivoId?: string    // vínculo com objetivo do simulador
  criadoEm: string
}

export type MovimentoCaixinhaTipo = 'deposito' | 'retirada' | 'transferencia'

export interface MovimentoCaixinha {
  id: string
  caixinhaId: string
  tipo: MovimentoCaixinhaTipo
  valor: number
  data: string
  observacao?: string
  caixinhaDestinoId?: string // para transferência
}

// ── Banco state (per profile) ─────────────────────────────────────────────────
export interface BancoState {
  contas: ContaBancaria[]
  transacoes: Transacao[]
  transferencias: Transferencia[]
  recorrentes: Recorrente[]
  caixinhas: Caixinha[]
  movimentosCaixinha: MovimentoCaixinha[]
}

export const emptyBanco = (): BancoState => ({
  contas: [],
  transacoes: [],
  transferencias: [],
  recorrentes: [],
  caixinhas: [],
  movimentosCaixinha: [],
})

// Ícones disponíveis para caixinhas (nomes Lucide)
export const CAIXINHA_ICONES = [
  'PiggyBank', 'Plane', 'Home', 'Car', 'Heart', 'GraduationCap',
  'Shield', 'Gift', 'Briefcase', 'Smartphone', 'Wrench', 'Landmark',
  'Sparkles', 'Target', 'Baby', 'PartyPopper',
]

export const CAIXINHA_CORES = [
  '#1d9e75', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#14b8a6', '#06b6d4', '#e8a020',
]

// ── Orçamento ───────────────────────────────────────────────────────────────
export interface OrcamentoItem {
  categoria: CategoriaFin
  limite: number
}

export interface ControleFinanceiro {
  orcamento: OrcamentoItem[]
  reservaEmergencia: number
}

export const emptyControle = (): ControleFinanceiro => ({
  orcamento: [],
  reservaEmergencia: 0,
})

// ── Category metadata (label, color, icon name, kind) ─────────────────────────
export interface CategoriaMeta {
  label: string
  cor: string
  icon: string // lucide icon name
  kind: 'entrada' | 'saida'
}

export const CATEGORIAS: Record<CategoriaFin, CategoriaMeta> = {
  // entradas
  salario:        { label: 'Salário',        cor: '#10b981', icon: 'Wallet',       kind: 'entrada' },
  pro_labore:     { label: 'Pró-labore',     cor: '#14b8a6', icon: 'Briefcase',    kind: 'entrada' },
  dividendos:     { label: 'Dividendos',     cor: '#22c55e', icon: 'TrendingUp',   kind: 'entrada' },
  freelance:      { label: 'Freelance',      cor: '#84cc16', icon: 'Laptop',       kind: 'entrada' },
  alugueis:       { label: 'Aluguéis',       cor: '#0ea5e9', icon: 'Home',         kind: 'entrada' },
  vendas_balcao:  { label: 'Vendas Balcão',  cor: '#10b981', icon: 'Store',        kind: 'entrada' },
  delivery:       { label: 'Delivery',       cor: '#06b6d4', icon: 'Bike',         kind: 'entrada' },
  eventos:        { label: 'Eventos',        cor: '#8b5cf6', icon: 'PartyPopper',  kind: 'entrada' },
  outros_entrada: { label: 'Outras Entradas',cor: '#64748b', icon: 'PlusCircle',   kind: 'entrada' },
  // despesas
  moradia:        { label: 'Moradia',        cor: '#f97316', icon: 'Home',         kind: 'saida' },
  alimentacao:    { label: 'Alimentação',    cor: '#ef4444', icon: 'Utensils',     kind: 'saida' },
  transporte:     { label: 'Transporte',     cor: '#eab308', icon: 'Car',          kind: 'saida' },
  saude:          { label: 'Saúde',          cor: '#ec4899', icon: 'HeartPulse',   kind: 'saida' },
  educacao:       { label: 'Educação',       cor: '#3b82f6', icon: 'GraduationCap',kind: 'saida' },
  lazer:          { label: 'Lazer',          cor: '#a855f7', icon: 'Gamepad2',     kind: 'saida' },
  assinaturas:    { label: 'Assinaturas',    cor: '#f43f5e', icon: 'Repeat',       kind: 'saida' },
  cartao:         { label: 'Cartão',         cor: '#d946ef', icon: 'CreditCard',   kind: 'saida' },
  insumos:        { label: 'Insumos',        cor: '#f59e0b', icon: 'Package',      kind: 'saida' },
  folha:          { label: 'Folha',          cor: '#fb923c', icon: 'Users',        kind: 'saida' },
  aluguel:        { label: 'Aluguel',        cor: '#f97316', icon: 'Building',     kind: 'saida' },
  utilidades:     { label: 'Utilidades',     cor: '#fbbf24', icon: 'Zap',          kind: 'saida' },
  marketing:      { label: 'Marketing',      cor: '#e879f9', icon: 'Megaphone',    kind: 'saida' },
  impostos:       { label: 'Impostos',       cor: '#dc2626', icon: 'Landmark',     kind: 'saida' },
  manutencao:     { label: 'Manutenção',     cor: '#a16207', icon: 'Wrench',       kind: 'saida' },
  outros_saida:   { label: 'Outras Saídas',  cor: '#64748b', icon: 'MinusCircle',  kind: 'saida' },
  // transfer
  transferencia:  { label: 'Transferência',  cor: '#14b8a6', icon: 'ArrowLeftRight', kind: 'saida' },
}

// Categories grouped for selectors
export const CATEGORIAS_ENTRADA_PESSOAL: CategoriaFin[] = ['salario', 'pro_labore', 'dividendos', 'freelance', 'alugueis', 'outros_entrada']
export const CATEGORIAS_SAIDA_PESSOAL: CategoriaFin[] = ['moradia', 'alimentacao', 'transporte', 'saude', 'educacao', 'lazer', 'assinaturas', 'cartao', 'outros_saida']
export const CATEGORIAS_ENTRADA_EMPRESA: CategoriaFin[] = ['vendas_balcao', 'delivery', 'eventos', 'outros_entrada']
export const CATEGORIAS_SAIDA_EMPRESA: CategoriaFin[] = ['insumos', 'folha', 'aluguel', 'utilidades', 'marketing', 'impostos', 'manutencao', 'outros_saida']

export function categoriasPorPerfil(perfil: 'pessoal' | 'empresa', tipo: 'entrada' | 'saida'): CategoriaFin[] {
  if (perfil === 'pessoal') return tipo === 'entrada' ? CATEGORIAS_ENTRADA_PESSOAL : CATEGORIAS_SAIDA_PESSOAL
  return tipo === 'entrada' ? CATEGORIAS_ENTRADA_EMPRESA : CATEGORIAS_SAIDA_EMPRESA
}

// ── Bank metadata ──────────────────────────────────────────────────────────
export const BANCOS: { nome: BancoNome; cor: string }[] = [
  { nome: 'Nubank',          cor: '#820ad1' },
  { nome: 'Itaú',            cor: '#ec7000' },
  { nome: 'Bradesco',        cor: '#cc092f' },
  { nome: 'Banco do Brasil', cor: '#f9dd16' },
  { nome: 'Caixa',           cor: '#0070af' },
  { nome: 'Santander',       cor: '#ec0000' },
  { nome: 'Inter',           cor: '#ff7a00' },
  { nome: 'C6',              cor: '#242424' },
  { nome: 'PicPay',          cor: '#21c25e' },
  { nome: 'Outro',           cor: '#64748b' },
]

export const CONTA_TIPOS: { tipo: ContaTipo; label: string }[] = [
  { tipo: 'corrente',        label: 'Corrente' },
  { tipo: 'poupanca',        label: 'Poupança' },
  { tipo: 'digital',         label: 'Digital' },
  { tipo: 'dinheiro',        label: 'Dinheiro' },
  { tipo: 'cartao_credito',  label: 'Cartão de Crédito' },
  { tipo: 'investimentos',   label: 'Investimentos' },
  { tipo: 'outro',           label: 'Outro' },
]
