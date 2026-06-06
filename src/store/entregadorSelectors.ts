import type { Empresa, Entregador, RegistroEntrega, PagamentoEntregador, ConfigEntregadores } from './empresaTypes'
import { inicioSemana, fimSemana, DEFAULT_CONFIG_ENTREGADORES } from './empresaTypes'

const dentroSemana = (data: string, semIni: string) => {
  const d = data.slice(0, 10)
  return d >= semIni && d <= fimSemana(semIni)
}

/** Config do ciclo (com defaults) */
export function getConfigEntregadores(emp: Empresa): ConfigEntregadores {
  return { ...DEFAULT_CONFIG_ENTREGADORES, ...(emp.configEntregadores ?? {}) }
}

const addDays = (iso: string, n: number) => {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
const pad = (n: number) => String(n).padStart(2, '0')

export interface ResumoSemana {
  entregador: Entregador
  totalEntregas: number
  valorEntregas: number
  valorFixo: number
  bonus: number
  desconto: number
  total: number
  pago: boolean
  pagamento?: PagamentoEntregador
}

/** Registros de um entregador numa semana (semIni = segunda ISO) */
export function registrosSemana(emp: Empresa, entregadorId: string, semIni: string): RegistroEntrega[] {
  return (emp.registrosEntrega ?? []).filter(r => r.entregadorId === entregadorId && dentroSemana(r.data, semIni))
}

export function entregasSemana(emp: Empresa, entregadorId: string, semIni: string): number {
  return registrosSemana(emp, entregadorId, semIni).reduce((s, r) => s + r.quantidade, 0)
}

/** Calcula o resumo a pagar de um entregador na semana */
export function resumoSemana(emp: Empresa, ent: Entregador, semIni: string): ResumoSemana {
  const regs = registrosSemana(emp, ent.id, semIni)
  const totalEntregas = regs.reduce((s, r) => s + r.quantidade, 0)
  const bonus = regs.reduce((s, r) => s + (r.bonus ?? 0), 0)
  const desconto = regs.reduce((s, r) => s + (r.desconto ?? 0), 0)
  const valorEntregas = totalEntregas * ent.valorPorEntrega
  const valorFixo = ent.valorFixoSemanal
  const total = valorFixo + valorEntregas + bonus - desconto
  const pagamento = (emp.pagamentosEntregador ?? []).find(p => p.entregadorId === ent.id && p.semanaInicio === semIni)
  return {
    entregador: ent, totalEntregas, valorEntregas, valorFixo, bonus, desconto,
    total: Math.max(0, total), pago: pagamento?.status === 'pago', pagamento,
  }
}

/** Resumo de todos os entregadores ativos na semana */
export function resumoTodos(emp: Empresa, semIni: string): ResumoSemana[] {
  return (emp.entregadores ?? [])
    .filter(e => e.status === 'ativo' || resumoSemana(emp, e, semIni).totalEntregas > 0)
    .map(e => resumoSemana(emp, e, semIni))
}

export function totalSemanaTodos(emp: Empresa, semIni: string): number {
  return resumoTodos(emp, semIni).reduce((s, r) => s + r.total, 0)
}

/** Custo por entrega num período (com base nos pagamentos feitos) */
export function custoPorEntrega(emp: Empresa, desdeISO: string): number {
  const regs = (emp.registrosEntrega ?? []).filter(r => r.data.slice(0, 10) >= desdeISO)
  const totalEnt = regs.reduce((s, r) => s + r.quantidade, 0)
  if (totalEnt === 0) return 0
  const ents = emp.entregadores ?? []
  let custo = 0
  // estima custo: entregas*valorPorEntrega + bonus - desconto (+ fixo proporcional ignorado)
  regs.forEach(r => {
    const e = ents.find(x => x.id === r.entregadorId)
    if (e) custo += r.quantidade * e.valorPorEntrega + (r.bonus ?? 0) - (r.desconto ?? 0)
  })
  return custo / totalEnt
}

// ── Visão mensal consolidada ──────────────────────────────────────────────────

/** Lista os inícios de semana que tocam o mês (ano-mes), conforme dia de início do ciclo */
export function semanasDoMes(emp: Empresa, ano: number, mes: number): string[] {
  const startDay = getConfigEntregadores(emp).inicioSemanaDia
  const primeiro = `${ano}-${pad(mes)}-01`
  const ultimo = `${ano}-${pad(mes)}-${pad(new Date(ano, mes, 0).getDate())}`
  const out: string[] = []
  let cursor = inicioSemana(primeiro, startDay)
  let guard = 0
  while (cursor <= ultimo && guard < 10) {
    out.push(cursor)
    cursor = addDays(cursor, 7)
    guard++
  }
  return out
}

/** Rateia um valor pelos dias da semana [ini..fim] que caem no mês prefix (YYYY-MM) */
function rateioNoMes(semIni: string, semFim: string, valor: number, prefix: string): number {
  let diasNoMes = 0
  let cursor = semIni
  for (let i = 0; i < 7; i++) {
    if (cursor.slice(0, 7) === prefix) diasNoMes++
    cursor = addDays(cursor, 1)
    if (cursor > semFim) break
  }
  return (valor * diasNoMes) / 7
}

/** Custo total com entregadores no mês (regime de competência configurável) */
export function custoEntregadoresMes(emp: Empresa, ano: number, mes: number): number {
  const prefix = `${ano}-${pad(mes)}`
  const comp = getConfigEntregadores(emp).competencia
  return (emp.pagamentosEntregador ?? [])
    .filter(p => p.status === 'pago')
    .reduce((s, p) => {
      if (comp === 'rateio') return s + rateioNoMes(p.semanaInicio, p.semanaFim, p.totalPago, prefix)
      // simples: tudo no mês do pagamento (regime de caixa = data do pagamento)
      const ref = (p.dataPagamento ?? p.semanaFim).slice(0, 7)
      return ref === prefix ? s + p.totalPago : s
    }, 0)
}

/** Folha mensal dos funcionários ativos (salário base) */
export function folhaMensal(emp: Empresa): number {
  return (emp.funcionarios ?? [])
    .filter(f => f.status === 'ativo' || f.status === 'ferias')
    .reduce((s, f) => s + (f.salarioBase ?? 0), 0)
}

/** Custo total de mão de obra no mês = folha funcionários + entregadores */
export function custoMaoObraMes(emp: Empresa, ano: number, mes: number): number {
  return folhaMensal(emp) + custoEntregadoresMes(emp, ano, mes)
}

/** Estimativa do custo de uma semana (fixos + variável estimado pela média recente) */
export function estimaSemana(emp: Empresa, semIni: string): number {
  const ativos = (emp.entregadores ?? []).filter(e => e.status === 'ativo')
  // parte fixa garantida
  const fixo = ativos.reduce((s, e) => s + e.valorFixoSemanal, 0)
  // parte variável: usa entregas já lançadas na própria semana, senão média das 4 semanas anteriores
  let variavel = 0
  ativos.forEach(e => {
    const naSemana = registrosSemana(emp, e.id, semIni).reduce((s, r) => s + r.quantidade, 0)
    if (naSemana > 0) { variavel += naSemana * e.valorPorEntrega; return }
    // média 4 semanas anteriores
    let soma = 0, n = 0
    for (let k = 1; k <= 4; k++) {
      const sem = addDays(semIni, -7 * k)
      const q = registrosSemana(emp, e.id, sem).reduce((s, r) => s + r.quantidade, 0)
      if (q > 0) { soma += q; n++ }
    }
    if (n > 0) variavel += (soma / n) * e.valorPorEntrega
  })
  return fixo + variavel
}

/** Projeção dos pagamentos semanais futuros (semanas ainda não pagas), no intervalo */
export function projecaoEntregadores(emp: Empresa, desdeISO: string, ateISO: string): { data: string; valor: number; semIni: string }[] {
  const cfg = getConfigEntregadores(emp)
  const out: { data: string; valor: number; semIni: string }[] = []
  let semIni = inicioSemana(desdeISO, cfg.inicioSemanaDia)
  let guard = 0
  while (semIni <= ateISO && guard < 12) {
    // dia de pagamento dentro desta semana
    const offset = (cfg.diaPagamento - cfg.inicioSemanaDia + 7) % 7
    const dataPag = addDays(semIni, offset)
    // só projeta se o pagamento é futuro (>= desde) e dentro do intervalo
    if (dataPag >= desdeISO && dataPag <= ateISO) {
      // não duplica semanas já totalmente pagas
      const pagos = (emp.pagamentosEntregador ?? []).filter(p => p.semanaInicio === semIni && p.status === 'pago')
      const ativos = (emp.entregadores ?? []).filter(e => e.status === 'ativo')
      const faltam = ativos.filter(e => !pagos.some(p => p.entregadorId === e.id))
      if (faltam.length > 0) {
        const est = estimaSemana(emp, semIni)
        const jaPago = pagos.reduce((s, p) => s + p.totalPago, 0)
        const restante = Math.max(0, est - jaPago)
        if (restante > 0) out.push({ data: dataPag, valor: restante, semIni })
      }
    }
    semIni = addDays(semIni, 7)
    guard++
  }
  return out
}

export { inicioSemana, fimSemana }
