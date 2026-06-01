// Tipos do módulo de Acompanhamento Real (objetivos + aportes reais)

export type ObjetivoTipo = 'patrimonio' | 'renda'
export type Frequencia = 'diario' | 'semanal' | 'mensal'

export interface Objetivo {
  id: string
  nome: string
  tipo: ObjetivoTipo
  valorAlvo: number          // se tipo='renda', é R$/mês; convertido p/ patrimônio via yield
  dataInicio: string         // ISO date (YYYY-MM-DD)
  dataAlvo?: string          // ISO date opcional
  frequencia: Frequencia
  valorPlanejado: number     // valor por aporte planejado
  yieldAnual: number
  principal: boolean
  criadoEm: string
}

export interface AporteReal {
  id: string
  objetivoId: string
  valor: number
  data: string               // ISO date
  contaOrigemId?: string
  observacao?: string
}

export interface ObjetivoState {
  objetivos: Objetivo[]
  aportesReais: AporteReal[]
}

export const emptyObjetivos = (): ObjetivoState => ({
  objetivos: [],
  aportesReais: [],
})

// ── Derivados / helpers de cálculo ──────────────────────────────────────────

/** Patrimônio-alvo efetivo: se tipo='renda', converte renda mensal em capital pelo yield */
export function patrimonioAlvo(o: Objetivo): number {
  if (o.tipo === 'patrimonio') return o.valorAlvo
  const ym = (1 + o.yieldAnual / 100) ** (1 / 12) - 1
  return ym > 0 ? o.valorAlvo / ym : Infinity
}

/** Aportes por mês equivalente, conforme a frequência planejada */
export function aporteMensalEquivalente(o: Objetivo): number {
  if (o.frequencia === 'diario') return o.valorPlanejado * 30
  if (o.frequencia === 'semanal') return o.valorPlanejado * (52 / 12)
  return o.valorPlanejado
}

export const DIAS_POR_FREQ: Record<Frequencia, number> = {
  diario: 1, semanal: 7, mensal: 30,
}

export const LABEL_FREQ: Record<Frequencia, string> = {
  diario: 'diário', semanal: 'semanal', mensal: 'mensal',
}
export const LABEL_PERIODO: Record<Frequencia, string> = {
  diario: 'dia', semanal: 'semana', mensal: 'mês',
}

/** dias entre duas datas ISO (b - a) */
export function diasEntre(aISO: string, bISO: string): number {
  const a = new Date(aISO.slice(0, 10) + 'T00:00:00').getTime()
  const b = new Date(bISO.slice(0, 10) + 'T00:00:00').getTime()
  return Math.round((b - a) / 86400000)
}

/** chave de período (agrupa um aporte por dia/semana/mês) */
export function chavePeriodo(dataISO: string, freq: Frequencia): string {
  const d = new Date(dataISO.slice(0, 10) + 'T00:00:00')
  if (freq === 'mensal') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  if (freq === 'semanal') {
    // ISO week
    const tmp = new Date(d)
    const day = tmp.getDay() || 7
    tmp.setDate(tmp.getDate() + 4 - day)
    const yearStart = new Date(tmp.getFullYear(), 0, 1)
    const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    return `${tmp.getFullYear()}-W${String(week).padStart(2, '0')}`
  }
  return d.toISOString().slice(0, 10) // diário
}

export interface PontoGrafico {
  label: string
  data: string       // ISO da referência
  real: number       // acumulado real (+ rendimentos)
  planejado: number  // acumulado planejado
  meta: number       // valor alvo (linha horizontal)
}

export interface StatusRitmo {
  cor: 'verde' | 'amarelo' | 'vermelho'
  texto: string
  emoji: string
}

export interface ProjecaoComparada {
  prazoPlanejadoMeses: number
  prazoRealMeses: number
  diferencaMeses: number      // real - planejado (negativo = adiantado)
  dataPlanejada: string | null
  dataReal: string | null
  adiantado: boolean
  // quanto guardar por período pra voltar ao plano
  aporteCorretivo: number
}
