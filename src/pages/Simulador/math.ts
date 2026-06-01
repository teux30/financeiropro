/** Yield mensal a partir do yield anual (%) */
export const toYieldMensal = (yieldAnual: number) =>
  (1 + yieldAnual / 100) ** (1 / 12) - 1

/** Patrimônio acumulado após `meses` meses */
export const calcPatrimonio = (
  inicial: number,
  mensal: number,
  ym: number,
  meses: number
): number => {
  if (ym === 0) return inicial + mensal * meses
  return (
    inicial * (1 + ym) ** meses +
    mensal * ((1 + ym) ** meses - 1) / ym
  )
}

/** Renda mensal gerada por determinado patrimônio */
export const calcRenda = (patrimonio: number, ym: number) => patrimonio * ym

/** Capital necessário para atingir renda meta */
export const calcCapitalNecessario = (meta: number, ym: number) =>
  ym > 0 ? meta / ym : Infinity

/** Meses para atingir a meta de renda (retorna Infinity se não atingir em 600 meses) */
export const calcPrazoMeses = (
  inicial: number,
  mensal: number,
  ym: number,
  meta: number
): number => {
  if (calcRenda(inicial, ym) >= meta) return 0
  for (let n = 1; n <= 600; n++) {
    if (calcRenda(calcPatrimonio(inicial, mensal, ym, n), ym) >= meta) return n
  }
  return Infinity
}

/** Formata meses em "X anos e Y meses" */
export const formatPrazo = (meses: number): string => {
  if (!isFinite(meses)) return '> 50 anos'
  if (meses === 0) return 'Já atingido!'
  const anos = Math.floor(meses / 12)
  const m = meses % 12
  if (anos === 0) return `${m} ${m === 1 ? 'mês' : 'meses'}`
  if (m === 0) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`
  return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${m} ${m === 1 ? 'mês' : 'meses'}`
}

/** Formata número como moeda BRL compacta (100k, 1.2M) */
export const fmtK = (v: number): string => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`
  return `R$ ${v.toFixed(0)}`
}

/** Formata número como moeda BRL completa */
export const fmtBRL = (v: number): string =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

/** Gera dados do gráfico para N anos */
export interface ChartPoint {
  label: string
  patrimonio: number
  rendaMensal: number
  totalAportado: number
  rendimentos: number
}

export const buildChartData = (
  inicial: number,
  mensal: number,
  ym: number,
  anos: number
): ChartPoint[] => {
  const data: ChartPoint[] = []
  for (let a = 0; a <= anos; a++) {
    const meses = a * 12
    const patrimonio = calcPatrimonio(inicial, mensal, ym, meses)
    const totalAportado = inicial + mensal * meses
    data.push({
      label: `Ano ${a}`,
      patrimonio,
      rendaMensal: calcRenda(patrimonio, ym),
      totalAportado,
      rendimentos: Math.max(0, patrimonio - totalAportado),
    })
  }
  return data
}

/** Gera projeção ano a ano */
export interface ProjecaoRow {
  ano: number
  patrimonio: number
  totalAportado: number
  rendimentos: number
  rendaMensal: number
  pctMeta: number
}

export const buildProjecao = (
  inicial: number,
  mensal: number,
  ym: number,
  meta: number,
  anos: number
): ProjecaoRow[] => {
  return Array.from({ length: anos }, (_, i) => {
    const meses = (i + 1) * 12
    const patrimonio = calcPatrimonio(inicial, mensal, ym, meses)
    const totalAportado = inicial + mensal * meses
    const rendaMensal = calcRenda(patrimonio, ym)
    return {
      ano: i + 1,
      patrimonio,
      totalAportado,
      rendimentos: Math.max(0, patrimonio - totalAportado),
      rendaMensal,
      pctMeta: meta > 0 ? (rendaMensal / meta) * 100 : 0,
    }
  })
}
