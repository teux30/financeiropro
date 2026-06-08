import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

// Helpers de data LOCAL (sem deslocamento de fuso)
const pad = (n: number) => String(n).padStart(2, '0')
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const hojeISO = () => { const d = new Date(); return toISO(d.getFullYear(), d.getMonth(), d.getDate()) }
const ontemISO = () => { const d = new Date(); d.setDate(d.getDate() - 1); return toISO(d.getFullYear(), d.getMonth(), d.getDate()) }
const parseISO = (iso: string) => {
  if (!iso || iso.length < 10) { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() } }
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return { y, m: m - 1, d }
}
const fmtBR = (iso: string) => { const { y, m, d } = parseISO(iso); return `${pad(d)}/${pad(m + 1)}/${y}` }

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

interface Props {
  value: string                 // YYYY-MM-DD
  onChange: (iso: string) => void
  label?: string
  accent?: string
  min?: string
  max?: string
  className?: string
}

export function DatePicker({ value, onChange, label, accent = '#1d9e75', min, max, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => { const p = parseISO(value || hojeISO()); return { y: p.y, m: p.m } })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) { const p = parseISO(value || hojeISO()); setView({ y: p.y, m: p.m }) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const hoje = hojeISO()
  const selISO = value ? value.slice(0, 10) : ''

  const primeiroDiaSemana = new Date(view.y, view.m, 1).getDay()
  const diasNoMes = new Date(view.y, view.m + 1, 0).getDate()
  const celulas: (number | null)[] = []
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null)
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d)

  const navMes = (delta: number) => {
    let m = view.m + delta, y = view.y
    if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ }
    setView({ y, m })
  }
  const disabled = (iso: string) => (min && iso < min) || (max && iso > max)
  const escolher = (iso: string) => { if (disabled(iso)) return; onChange(iso); setOpen(false) }

  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && <label className="text-sm font-medium text-[#8b949e] block mb-1.5">{label}</label>}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-left focus:outline-none"
        style={{ color: selISO ? '#e6edf3' : '#484f58' }}>
        <Calendar size={15} style={{ color: accent }} />
        <span className="flex-1">{selISO ? fmtBR(selISO) : 'Selecionar data'}</span>
      </button>

      {open && (
        <>
          {/* overlay (mobile bottom sheet) */}
          <div className="sm:hidden fixed inset-0 z-[70] bg-black/60" onClick={() => setOpen(false)} />
          <div
            className="z-[71] bg-[#161b22] border border-[#30363d] rounded-2xl p-3 shadow-2xl
                       fixed left-0 right-0 bottom-0 rounded-b-none
                       sm:absolute sm:left-0 sm:right-auto sm:bottom-auto sm:mt-2 sm:rounded-2xl sm:w-[300px]"
            style={{ paddingBottom: 'max(12px, var(--safe-bottom))' }}
          >
            {/* header mês */}
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => navMes(-1)} className="p-2 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"><ChevronLeft size={18} /></button>
              <span className="text-sm font-semibold text-[#e6edf3]">{MESES[view.m]} {view.y}</span>
              <button type="button" onClick={() => navMes(1)} className="p-2 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"><ChevronRight size={18} /></button>
            </div>

            {/* dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DIAS.map((d, i) => <div key={i} className="text-center text-[11px] text-[#484f58] font-medium py-1">{d}</div>)}
            </div>

            {/* grade */}
            <div className="grid grid-cols-7 gap-1">
              {celulas.map((d, i) => {
                if (d === null) return <div key={i} />
                const iso = toISO(view.y, view.m, d)
                const isSel = iso === selISO
                const isHoje = iso === hoje
                const isDisabled = !!disabled(iso)
                return (
                  <button key={i} type="button" onClick={() => escolher(iso)} disabled={isDisabled}
                    className="aspect-square rounded-lg text-sm flex items-center justify-center transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                    style={{
                      background: isSel ? accent : 'transparent',
                      color: isSel ? '#fff' : isHoje ? accent : '#e6edf3',
                      fontWeight: isSel || isHoje ? 700 : 400,
                      border: isHoje && !isSel ? `1px solid ${accent}` : '1px solid transparent',
                    }}>
                    {d}
                  </button>
                )
              })}
            </div>

            {/* atalhos */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-[#21262d]">
              <button type="button" onClick={() => escolher(hojeISO())} className="flex-1 py-2 rounded-lg text-xs font-medium" style={{ background: `${accent}22`, color: accent }}>Hoje</button>
              <button type="button" onClick={() => escolher(ontemISO())} className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#21262d] text-[#8b949e]">Ontem</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
