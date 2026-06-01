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

export const fmtData = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const fmtDataHora = (iso: string): string => {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const fmtPct = (v: number): string => `${v >= 0 ? '' : ''}${v.toFixed(1)}%`

export const hoje = (): string => new Date().toISOString().slice(0, 10)

export const mesAtual = (): string => new Date().toISOString().slice(0, 7) // YYYY-MM

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
