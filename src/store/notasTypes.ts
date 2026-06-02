// Bloco de Notas Inteligente — tipos

export type NotaTipo = 'simples' | 'checklist' | 'lembrete' | 'financeira'
export type Recorrencia = 'nenhuma' | 'semanal' | 'mensal'

export interface ChecklistItemNota {
  id: string
  texto: string
  feito: boolean
}

export interface VinculoNota {
  tipo: 'conta' | 'transacao' | 'modulo'
  id: string
  label?: string
}

export interface Nota {
  id: string
  tipo: NotaTipo
  titulo: string
  texto: string
  itensChecklist?: ChecklistItemNota[]
  cor: string
  tags: string[]
  fixada: boolean
  arquivada: boolean
  dataLembrete?: string      // ISO datetime
  recorrencia?: Recorrencia
  lembreteResolvido?: boolean
  vinculo?: VinculoNota
  criadaEm: string
  atualizadaEm: string
}

export const NOTA_CORES = [
  '#1d9e75', '#e8a020', '#3b82f6', '#8b5cf6', '#ec4899',
  '#ef4444', '#14b8a6', '#eab308', '#64748b',
]

export const emptyNotas = (): Nota[] => []
