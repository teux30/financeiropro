import type { Empresa } from '../store/empresaTypes'

export interface Aviso {
  id: string            // conta.id
  empresaId: string
  empresaNome: string
  descricao: string
  valor: number
  vencimento: string    // ISO
  dias: number          // dias até vencer (negativo = vencido)
  urgencia: 'vencido' | 'hoje' | 'urgente' | 'proximo'
}

export const daysUntil = (iso: string): number =>
  Math.floor((new Date(iso.slice(0, 10) + 'T00:00:00').getTime() - new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime()) / 86400000)

/** Lista de contas a pagar pendentes vencendo dentro de `janela` dias (inclui vencidas) */
export function calcularAvisos(empresas: Empresa[], janela = 7): Aviso[] {
  const out: Aviso[] = []
  empresas.forEach(e => {
    e.contasPagar.filter(c => c.status === 'pendente').forEach(c => {
      const dias = daysUntil(c.vencimento)
      if (dias <= janela) {
        out.push({
          id: c.id, empresaId: e.id, empresaNome: e.nome,
          descricao: c.descricao, valor: c.valor, vencimento: c.vencimento, dias,
          urgencia: dias < 0 ? 'vencido' : dias === 0 ? 'hoje' : dias <= 2 ? 'urgente' : 'proximo',
        })
      }
    })
  })
  return out.sort((a, b) => a.dias - b.dias)
}

export const corUrgencia = (u: Aviso['urgencia']) =>
  u === 'vencido' || u === 'hoje' ? '#ef4444' : u === 'urgente' ? '#e8a020' : '#3b82f6'

export const textoUrgencia = (a: Aviso): string => {
  if (a.dias < 0) return `vencido há ${Math.abs(a.dias)} ${Math.abs(a.dias) === 1 ? 'dia' : 'dias'}`
  if (a.dias === 0) return 'vence hoje'
  if (a.dias === 1) return 'vence amanhã'
  return `vence em ${a.dias} dias`
}
