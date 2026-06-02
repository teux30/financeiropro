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

// ── Entregadores (delivery) ───────────────────────────────────────────────────
export interface Entregador {
  id: string
  nome: string
  tipo: 'fixo' | 'eventual'
  contato?: string
  pix?: string
  cpf?: string
  veiculo?: 'moto' | 'bike' | 'carro' | 'outro'
  valorFixoSemanal: number
  valorPorEntrega: number
  observacoes?: string
  status: 'ativo' | 'inativo'
  criadoEm: string
}

export interface RegistroEntrega {
  id: string
  entregadorId: string
  data: string          // ISO
  quantidade: number
  bonus?: number
  desconto?: number
  observacao?: string
}

export interface PagamentoEntregador {
  id: string
  entregadorId: string
  semanaInicio: string  // ISO (segunda)
  semanaFim: string     // ISO (domingo)
  valorFixo: number
  totalEntregas: number
  valorEntregas: number
  bonus: number
  desconto: number
  totalPago: number
  contaId?: string
  status: 'pendente' | 'pago'
  dataPagamento?: string
  transacaoId?: string
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
  entregadores?: Entregador[]
  registrosEntrega?: RegistroEntrega[]
  pagamentosEntregador?: PagamentoEntregador[]
  notas?: import('./notasTypes').Nota[]
}

// ── Helpers de semana (segunda a domingo) ─────────────────────────────────────
export function inicioSemana(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  const day = d.getDay() // 0=dom
  const diff = day === 0 ? -6 : 1 - day // volta até segunda
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}
export function fimSemana(iso: string): string {
  const ini = new Date(inicioSemana(iso) + 'T00:00:00')
  ini.setDate(ini.getDate() + 6)
  return ini.toISOString().slice(0, 10)
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
