import type { Empresa, Entregador, RegistroEntrega, PagamentoEntregador } from './empresaTypes'
import { inicioSemana, fimSemana } from './empresaTypes'

const dentroSemana = (data: string, semIni: string) => {
  const d = data.slice(0, 10)
  return d >= semIni && d <= fimSemana(semIni)
}

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

export { inicioSemana, fimSemana }
