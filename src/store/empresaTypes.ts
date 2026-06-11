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
  // preenchidos ao quitar (a transação é a fonte da verdade)
  contaId?: string         // conta bancária de onde saiu/entrou o dinheiro
  transacaoId?: string     // transação gerada na quitação
  fornecedorId?: string    // fornecedor vinculado
  dataPagamento?: string   // data real do pagamento/recebimento
}

// ── Fornecedor ────────────────────────────────────────────────────────────────
export interface Fornecedor {
  id: string
  nome: string
  categoria?: string       // carnes, bebidas, hortifruti, embalagens, gás, limpeza, serviços...
  contato?: string         // telefone/WhatsApp
  email?: string
  cnpj?: string
  pix?: string
  observacoes?: string
  status: 'ativo' | 'inativo'
  criadoEm: string
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

// ── Cardápio (pratos/produtos vendidos) ───────────────────────────────────────
export interface ComposicaoItem {
  insumoId: string
  quantidade: number   // na unidade do insumo
}

export interface ItemCardapio {
  id: string
  nome: string
  categoria?: string
  precoVenda: number
  composicao: ComposicaoItem[]   // insumos que compõem o prato
  custoManual?: number           // override opcional do custo (quando não há composição)
  descricao?: string
  imagem?: string
  ativo: boolean
  criadoEm: string
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

// ── Configuração do ciclo semanal de entregadores ────────────────────────────
export interface ConfigEntregadores {
  inicioSemanaDia: number   // 0=domingo ... 6=sábado — dia em que a semana de pagamento começa
  diaPagamento: number      // 0..6 — dia da semana do fechamento/pagamento
  competencia: 'simples' | 'rateio'  // como atribuir custo de semana que cruza o mês
}

export const DEFAULT_CONFIG_ENTREGADORES: ConfigEntregadores = {
  inicioSemanaDia: 1,  // segunda-feira
  diaPagamento: 0,     // domingo (fim da semana seg-dom)
  competencia: 'simples',
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
  configEntregadores?: ConfigEntregadores
  fornecedores?: Fornecedor[]   // cadastro de fornecedores para vincular às saídas/contas
  cardapio?: ItemCardapio[]     // pratos/produtos vendidos (custo derivado dos insumos)
  configPrecificacao?: ConfigPrecificacao
  notas?: import('./notasTypes').Nota[]
}

/** Margem de segurança adicionada ao custo calculado de um item do cardápio (10%). */
export const MARGEM_SEGURANCA_CARDAPIO = 0.10

// ── Precificação / markup (config da empresa) ─────────────────────────────────
export interface ConfigPrecificacao {
  custosFixosMensais: number     // aluguel, energia, etc. (sem folha/insumos)
  proLabore: number              // retirada do dono
  faturamentoEstimado: number    // faturamento mensal estimado (base do rateio de fixos)
  despesasVariaveisPct: number   // % sobre venda: taxas de cartão/plataforma, impostos, comissões
  lucroDesejadoPct: number       // % de lucro líquido desejado
}

export const DEFAULT_CONFIG_PRECIFICACAO: ConfigPrecificacao = {
  custosFixosMensais: 0, proLabore: 0, faturamentoEstimado: 0,
  despesasVariaveisPct: 0, lucroDesejadoPct: 0,
}

// ── Helpers de semana (início configurável; padrão segunda-feira) ─────────────
/** Início da semana que contém `iso`. startDay: 0=domingo..6=sábado (padrão 1=segunda) */
export function inicioSemana(iso: string, startDay = 1): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  const diff = (d.getDay() - startDay + 7) % 7
  d.setDate(d.getDate() - diff)
  return d.toISOString().slice(0, 10)
}
/** Fim da semana (início + 6 dias) */
export function fimSemana(iso: string, startDay = 1): string {
  const ini = new Date(inicioSemana(iso, startDay) + 'T00:00:00')
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
