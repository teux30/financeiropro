import type {
  Objetivo, AporteReal, PontoGrafico, StatusRitmo, ProjecaoComparada,
} from './objetivoTypes'
import {
  patrimonioAlvo, aporteMensalEquivalente, diasEntre, chavePeriodo,
} from './objetivoTypes'

const hojeISO = () => new Date().toISOString().slice(0, 10)
const ymDe = (yieldAnual: number) => (1 + yieldAnual / 100) ** (1 / 12) - 1

/** Soma de todos os aportes reais de um objetivo */
export function totalGuardado(aportes: AporteReal[], objetivoId: string): number {
  return aportes.filter(a => a.objetivoId === objetivoId).reduce((s, a) => s + a.valor, 0)
}

/** Total guardado + rendimentos estimados (juros sobre o tempo de cada aporte) */
export function totalComRendimentos(o: Objetivo, aportes: AporteReal[]): number {
  const ym = ymDe(o.yieldAnual)
  const hoje = hojeISO()
  return aportes
    .filter(a => a.objetivoId === o.id)
    .reduce((s, a) => {
      const meses = Math.max(0, diasEntre(a.data, hoje) / 30)
      return s + a.valor * (1 + ym) ** meses
    }, 0)
}

export function progressoPercentual(o: Objetivo, aportes: AporteReal[]): number {
  const alvo = patrimonioAlvo(o)
  if (!isFinite(alvo) || alvo <= 0) return 0
  return Math.min(100, (totalComRendimentos(o, aportes) / alvo) * 100)
}

/** Renda passiva atual estimada com o que já foi guardado */
export function rendaPassivaAtual(o: Objetivo, aportes: AporteReal[]): number {
  const ym = ymDe(o.yieldAnual)
  return totalComRendimentos(o, aportes) * ym
}

/** Média real de aporte por período (conforme frequência) */
export function ritmoReal(o: Objetivo, aportes: AporteReal[]): number {
  const lista = aportes.filter(a => a.objetivoId === o.id)
  if (lista.length === 0) return 0
  const periodos = new Set(lista.map(a => chavePeriodo(a.data, o.frequencia)))
  const total = lista.reduce((s, a) => s + a.valor, 0)
  return total / Math.max(1, periodos.size)
}

/** Quanto guardou no mês corrente vs planejado mensal-equivalente */
export function mesAtualVsPlanejado(o: Objetivo, aportes: AporteReal[]): { real: number; planejado: number } {
  const mes = hojeISO().slice(0, 7)
  const real = aportes
    .filter(a => a.objetivoId === o.id && a.data.slice(0, 7) === mes)
    .reduce((s, a) => s + a.valor, 0)
  return { real, planejado: aporteMensalEquivalente(o) }
}

export function statusRitmo(o: Objetivo, aportes: AporteReal[]): StatusRitmo {
  const ritmo = ritmoReal(o, aportes)
  const planejado = o.valorPlanejado
  if (planejado <= 0 || aportes.filter(a => a.objetivoId === o.id).length === 0) {
    return { cor: 'amarelo', texto: 'Comece a guardar', emoji: '🟡' }
  }
  const ratio = ritmo / planejado
  if (ratio >= 0.95) return { cor: 'verde', texto: 'No ritmo!', emoji: '🟢' }
  if (ratio >= 0.6) return { cor: 'amarelo', texto: 'Um pouco atrás', emoji: '🟡' }
  return { cor: 'vermelho', texto: 'Atrasado', emoji: '🔴' }
}

/** Sequência (streak) de períodos consecutivos com aporte, terminando no período atual ou anterior */
export function streak(o: Objetivo, aportes: AporteReal[]): number {
  const lista = aportes.filter(a => a.objetivoId === o.id)
  if (lista.length === 0) return 0
  const periodos = new Set(lista.map(a => chavePeriodo(a.data, o.frequencia)))

  // gera períodos pra trás a partir de hoje e conta consecutivos presentes
  const passoDias = o.frequencia === 'diario' ? 1 : o.frequencia === 'semanal' ? 7 : 30
  let count = 0
  const cursor = new Date(hojeISO() + 'T00:00:00')
  // tolera o período atual ainda sem aporte: começa olhando o atual; se faltar, tenta o anterior uma vez
  let toleranciaInicial = true
  for (let i = 0; i < 400; i++) {
    const chave = chavePeriodo(cursor.toISOString().slice(0, 10), o.frequencia)
    if (periodos.has(chave)) {
      count++
      toleranciaInicial = false
    } else if (toleranciaInicial && i === 0) {
      // período atual vazio é tolerado (ainda dá tempo de guardar)
      toleranciaInicial = false
    } else {
      break
    }
    cursor.setDate(cursor.getDate() - passoDias)
  }
  return count
}

/** Meses para atingir alvo dado aporte mensal-equivalente e yield */
function mesesParaAlvo(inicial: number, aporteMensal: number, ym: number, alvo: number): number {
  if (!isFinite(alvo)) return Infinity
  if (inicial >= alvo) return 0
  if (aporteMensal <= 0 && ym <= 0) return Infinity
  let pat = inicial
  for (let n = 1; n <= 1200; n++) {
    pat = pat * (1 + ym) + aporteMensal
    if (pat >= alvo) return n
  }
  return Infinity
}

function addMesesISO(baseISO: string, meses: number): string | null {
  if (!isFinite(meses)) return null
  const d = new Date(baseISO.slice(0, 10) + 'T00:00:00')
  d.setMonth(d.getMonth() + Math.round(meses))
  return d.toISOString().slice(0, 10)
}

export function projecaoComparada(o: Objetivo, aportes: AporteReal[]): ProjecaoComparada {
  const ym = ymDe(o.yieldAnual)
  const alvo = patrimonioAlvo(o)
  const jaGuardado = totalComRendimentos(o, aportes)

  // Plano: a partir de hoje, do que já tem, no ritmo planejado
  const planMensal = aporteMensalEquivalente(o)
  const prazoPlan = mesesParaAlvo(jaGuardado, planMensal, ym, alvo)

  // Real: usa o ritmo médio efetivo
  const realMensalEquivalente = (() => {
    const r = ritmoReal(o, aportes)
    if (o.frequencia === 'diario') return r * 30
    if (o.frequencia === 'semanal') return r * (52 / 12)
    return r
  })()
  const prazoReal = mesesParaAlvo(jaGuardado, realMensalEquivalente, ym, alvo)

  const diff = (isFinite(prazoReal) ? prazoReal : 9999) - (isFinite(prazoPlan) ? prazoPlan : 9999)

  // aporte corretivo: pra atingir no prazo planejado, quanto/mês seria preciso
  let aporteCorretivo = planMensal
  if (isFinite(prazoPlan) && prazoPlan > 0) {
    // PMT necessário pra ir de jaGuardado a alvo em prazoPlan meses
    if (ym > 0) {
      const fator = ((1 + ym) ** prazoPlan - 1) / ym
      aporteCorretivo = Math.max(0, (alvo - jaGuardado * (1 + ym) ** prazoPlan) / fator)
    } else {
      aporteCorretivo = Math.max(0, (alvo - jaGuardado) / prazoPlan)
    }
  }
  // converte de volta pra unidade da frequência
  if (o.frequencia === 'diario') aporteCorretivo /= 30
  else if (o.frequencia === 'semanal') aporteCorretivo /= (52 / 12)

  return {
    prazoPlanejadoMeses: prazoPlan,
    prazoRealMeses: prazoReal,
    diferencaMeses: diff,
    dataPlanejada: addMesesISO(hojeISO(), prazoPlan),
    dataReal: addMesesISO(hojeISO(), prazoReal),
    adiantado: diff < 0,
    aporteCorretivo,
  }
}

/** Dados do gráfico: real acumulado, planejado acumulado, linha meta */
export function dadosGrafico(o: Objetivo, aportes: AporteReal[]): PontoGrafico[] {
  const ym = ymDe(o.yieldAnual)
  const alvo = patrimonioAlvo(o)
  const lista = [...aportes.filter(a => a.objetivoId === o.id)].sort((a, b) => a.data.localeCompare(b.data))

  const inicio = o.dataInicio.slice(0, 10)
  const hoje = hojeISO()
  const fim = lista.length ? (lista[lista.length - 1].data.slice(0, 10) > hoje ? lista[lista.length - 1].data.slice(0, 10) : hoje) : hoje

  // passo conforme frequência
  const passoDias = o.frequencia === 'diario' ? 1 : o.frequencia === 'semanal' ? 7 : 30
  const totalDias = Math.max(passoDias, diasEntre(inicio, fim))
  const nPontos = Math.min(120, Math.max(2, Math.ceil(totalDias / passoDias) + 1))

  const planMensal = aporteMensalEquivalente(o)
  const pontos: PontoGrafico[] = []

  for (let i = 0; i < nPontos; i++) {
    const d = new Date(inicio + 'T00:00:00')
    d.setDate(d.getDate() + i * passoDias)
    const dataISO = d.toISOString().slice(0, 10)
    const mesesDesdeInicio = diasEntre(inicio, dataISO) / 30

    // planejado acumulado (juros compostos mensais)
    let planejado: number
    if (ym > 0) planejado = planMensal * (((1 + ym) ** mesesDesdeInicio - 1) / ym)
    else planejado = planMensal * mesesDesdeInicio

    // real acumulado até a data (cada aporte rende até a data do ponto)
    const real = lista
      .filter(a => a.data.slice(0, 10) <= dataISO)
      .reduce((s, a) => {
        const m = Math.max(0, diasEntre(a.data, dataISO) / 30)
        return s + a.valor * (1 + ym) ** m
      }, 0)

    const label = o.frequencia === 'mensal'
      ? d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

    pontos.push({ label, data: dataISO, real, planejado, meta: alvo })
  }
  return pontos
}

/** Heatmap: lista de { data, valor } agregada por dia (para os últimos N dias) */
export function heatmapDias(o: Objetivo, aportes: AporteReal[], dias = 119): { data: string; valor: number }[] {
  const map = new Map<string, number>()
  aportes.filter(a => a.objetivoId === o.id).forEach(a => {
    const k = a.data.slice(0, 10)
    map.set(k, (map.get(k) ?? 0) + a.valor)
  })
  const out: { data: string; valor: number }[] = []
  const hoje = new Date(hojeISO() + 'T00:00:00')
  for (let i = dias; i >= 0; i--) {
    const d = new Date(hoje)
    d.setDate(d.getDate() - i)
    const k = d.toISOString().slice(0, 10)
    out.push({ data: k, valor: map.get(k) ?? 0 })
  }
  return out
}

/** Próximo aporte planejado (data) com base na frequência e no último aporte */
export function proximoAportePlanejado(o: Objetivo, aportes: AporteReal[]): string {
  const lista = [...aportes.filter(a => a.objetivoId === o.id)].sort((a, b) => b.data.localeCompare(a.data))
  const passoDias = o.frequencia === 'diario' ? 1 : o.frequencia === 'semanal' ? 7 : 30
  const base = lista.length ? lista[0].data.slice(0, 10) : o.dataInicio.slice(0, 10)
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + passoDias)
  return d.toISOString().slice(0, 10)
}

/** Marcos atingidos (25/50/75/100) com base no progresso */
export function marcosAtingidos(pct: number): number[] {
  return [25, 50, 75, 100].filter(m => pct >= m)
}
