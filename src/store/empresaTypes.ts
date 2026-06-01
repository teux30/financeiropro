// Business & shared types for the multi-profile Finance Pro store

export type FluxoCategoria =
  | 'vendas_balcao' | 'delivery' | 'eventos' | 'outros_entrada'
  | 'fornecedores' | 'folha' | 'aluguel' | 'utilidades'
  | 'manutencao' | 'marketing' | 'impostos' | 'outros_saida'

export type ContaStatus =
  | 'pendente' | 'pago' | 'vencido' | 'parcelado'
  | 'recebido' | 'em_atraso' | 'aguardando'

// ── DRE ──────────────────────────────────────────────────────────────────────
export type DRECategoria = 'receita' | 'deducao' | 'cmv' | 'despesa_op' | 'depreciacao' | 'imposto'

export interface DRELinha {
  id: string
  descricao: string
  valor: number
  categoria: DRECategoria
  editavel: boolean
}

export interface DREPeriodo {
  id: string
  mes: number
  ano: number
  linhas: DRELinha[]
  observacao: string
}

// ── Fluxo de Caixa ─────────────────────────────────────────────────────────
export interface FluxoLancamento {
  id: string
  data: string
  tipo: 'entrada' | 'saida'
  descricao: string
  valor: number
  categoria: FluxoCategoria
  fornecedor?: string
  recorrente?: boolean
  liquidado: boolean
}

// ── Contas ─────────────────────────────────────────────────────────────────
export interface Conta {
  id: string
  descricao: string
  valor: number
  vencimento: string
  status: ContaStatus
  categoria: FluxoCategoria
  fornecedor?: string
  recorrente?: boolean
}

// ── Funcionários ────────────────────────────────────────────────────────────
export interface Funcionario {
  id: string
  nome: string
  cargo: string
  admissao: string
  salarioBase: number
  status: 'ativo' | 'inativo' | 'ferias'
}

// ── Estoque ────────────────────────────────────────────────────────────────
export interface Insumo {
  id: string
  nome: string
  unidade: string
  estoqueAtual: number
  estoqueMinimo: number
  custoUnitario: number
  fornecedor?: string
}

export interface MovimentoEstoque {
  id: string
  insumoId: string
  tipo: 'entrada' | 'saida'
  quantidade: number
  custoUnitario: number
  data: string
  observacao?: string
}

// ── Empresa ─────────────────────────────────────────────────────────────────
export interface EmpresaMetas {
  faturamento: number
  lucro: number
  cmvMax: number
  custosRHMax: number
}

export interface Empresa {
  id: string
  nome: string
  setor: string
  cnpj?: string
  cor: string
  logoInicial: string
  metas: EmpresaMetas
  dre: DREPeriodo[]
  fluxoCaixa: FluxoLancamento[]
  contasPagar: Conta[]
  contasReceber: Conta[]
  funcionarios: Funcionario[]
  insumos: Insumo[]
  movimentosEstoque: MovimentoEstoque[]
  banco?: import('./bancoTypes').BancoState
  controleFinanceiro?: import('./bancoTypes').ControleFinanceiro
  centroCustos?: { area: string; cor: string }[]
}

// ── Separação ───────────────────────────────────────────────────────────────
export interface HistoricoProLabore {
  id: string
  mes: number
  ano: number
  valor: number
  observacao?: string
}

export interface Separacao {
  proLabore: number
  pctInvestimentos: number
  pctDespesas: number
  pctReserva: number
  historico: HistoricoProLabore[]
}

// ── Usuário ─────────────────────────────────────────────────────────────────
export interface UsuarioPessoal {
  nome: string
}
