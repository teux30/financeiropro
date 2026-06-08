// Shared formatting helpers (pt-BR)

export const fmtBRL = (v: number): string =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fmtBRLshort = (v: number): string => {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toFixed(0)}k`
  return `${sign}R$ ${abs.toFixed(0)}`
}

// Datas "YYYY-MM-DD" sem hora são interpretadas como UTC pelo JS e, no fuso do
// Brasil (UTC-3), acabam exibindo o dia anterior. Forçamos hora local meio-dia
// para datas só-data, evitando o deslocamento.
const parseLocal = (iso: string): Date =>
  iso.length <= 10 ? new Date(iso + 'T12:00:00') : new Date(iso)

export const fmtData = (iso: string): string => {
  return parseLocal(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const fmtDataHora = (iso: string): string => {
  return parseLocal(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const fmtPct = (v: number): string => `${v >= 0 ? '' : ''}${v.toFixed(1)}%`

// Data local YYYY-MM-DD (evita o deslocamento do toISOString, que usa UTC)
export const hoje = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const mesAtual = (): string => hoje().slice(0, 7) // YYYY-MM

export const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/** Agrupa data ISO em rótulo "Hoje" / "Ontem" / "dd/MM/yyyy" */
export const labelDia = (iso: string): string => {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}

/** Mascara saldo quando ocultarSaldos ativo */
export const maskSaldo = (texto: string, ocultar: boolean): string =>
  ocultar ? 'R$ ••••••' : texto

/** Variação percentual */
export const variacao = (atual: number, anterior: number): number => {
  if (anterior === 0) return atual === 0 ? 0 : 100
  return ((atual - anterior) / Math.abs(anterior)) * 100
}
