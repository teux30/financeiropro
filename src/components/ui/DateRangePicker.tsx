import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const pad = (n: number) => String(n).padStart(2, '0')
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const parseISO = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return { y, m: m - 1, d } }
const fmtBR = (iso: string) => { const { y, m, d } = parseISO(iso); return `${pad(d)}/${pad(m + 1)}/${y}` }
const addDays = (iso: string, n: number) => { const { y, m, d } = parseISO(iso); const x = new Date(y, m, d + n); return toISO(x.getFullYear(), x.getMonth(), x.getDate()) }
const hojeISO = () => { const d = new Date(); return toISO(d.getFullYear(), d.getMonth(), d.getDate()) }

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export interface Range { de: string; ate: string }

function atalhos(): { label: string; range: () => Range }[] {
  const h = hojeISO()
  const { y, m } = parseISO(h)
  const inicioMes = toISO(y, m, 1)
  const fimMes = toISO(y, m, new Date(y, m + 1, 0).getDate())
  const mesPassado = m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }
  const inicioMesPassado = toISO(mesPassado.y, mesPassado.m, 1)
  const fimMesPassado = toISO(mesPassado.y, mesPassado.m, new Date(mesPassado.y, mesPassado.m + 1, 0).getDate())
  // semana (domingo a sábado)
  const diaSemana = new Date(y, m, parseISO(h).d).getDay()
  const inicioSemana = addDays(h, -diaSemana)
  const fimSemana = addDays(inicioSemana, 6)
  return [
    { label: 'Hoje', range: () => ({ de: h, ate: h }) },
    { label: 'Esta semana', range: () => ({ de: inicioSemana, ate: fimSemana }) },
    { label: 'Este mês', range: () => ({ de: inicioMes, ate: fimMes }) },
    { label: 'Mês passado', range: () => ({ de: inicioMesPassado, ate: fimMesPassado }) },
  ]
}

interface Props {
  value: Range
  onChange: (r: Range) => void
  accent?: string
  className?: string
}

export function DateRangePicker({ value, onChange, accent = '#1d9e75', className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => { const p = parseISO(value.de || hojeISO()); return { y: p.y, m: p.m } })
  const [sel, setSel] = useState<Range>(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) { setSel(value); const p = parseISO(value.de || hojeISO()); setView({ y: p.y, m: p.m }) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const navMes = (delta: number) => { let m = view.m + delta, y = view.y; if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ } setView({ y, m }) }
  const primeiro = new Date(view.y, view.m, 1).getDay()
  const diasNoMes = new Date(view.y, view.m + 1, 0).getDate()
  const celulas: (number | null)[] = []
  for (let i = 0; i < primeiro; i++) celulas.push(null)
  for (let d = 1; d <= diasNoMes; d++) celulas.push(d)

  const clicar = (iso: string) => {
    if (!sel.de || (sel.de && sel.ate)) setSel({ de: iso, ate: '' })
    else if (iso < sel.de) setSel({ de: iso, ate: sel.de })
    else setSel({ de: sel.de, ate: iso })
  }
  const aplicar = (r: Range) => { onChange(r); setOpen(false) }
  const noRange = (iso: string) => sel.de && sel.ate && iso >= sel.de && iso <= sel.ate

  const label = value.de === value.ate ? fmtBR(value.de) : `${fmtBR(value.de)} – ${fmtBR(value.ate)}`

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-[#161b22] border border-[#21262d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
        <Calendar size={15} style={{ color: accent }} />
        <span>{label}</span>
      </button>

      {open && (
        <>
          <div className="sm:hidden fixed inset-0 z-[70] bg-black/60" onClick={() => setOpen(false)} />
          <div className="z-[71] bg-[#161b22] border border-[#30363d] rounded-2xl p-3 shadow-2xl
                          fixed left-0 right-0 bottom-0 rounded-b-none
                          sm:absolute sm:right-0 sm:left-auto sm:bottom-auto sm:mt-2 sm:rounded-2xl sm:w-[320px]"
            style={{ paddingBottom: 'max(12px, var(--safe-bottom))' }}>
            {/* atalhos */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {atalhos().map(a => (
                <button key={a.label} type="button" onClick={() => aplicar(a.range())}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: `${accent}18`, color: accent }}>{a.label}</button>
              ))}
            </div>
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => navMes(-1)} className="p-2 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"><ChevronLeft size={18} /></button>
              <span className="text-sm font-semibold text-[#e6edf3]">{MESES[view.m]} {view.y}</span>
              <button type="button" onClick={() => navMes(1)} className="p-2 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DIAS.map((d, i) => <div key={i} className="text-center text-[11px] text-[#484f58] font-medium py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {celulas.map((d, i) => {
                if (d === null) return <div key={i} />
                const iso = toISO(view.y, view.m, d)
                const isStart = iso === sel.de, isEnd = iso === sel.ate
                const inRange = noRange(iso)
                return (
                  <button key={i} type="button" onClick={() => clicar(iso)}
                    className="aspect-square rounded-lg text-sm flex items-center justify-center transition-colors"
                    style={{
                      background: isStart || isEnd ? accent : inRange ? `${accent}33` : 'transparent',
                      color: isStart || isEnd ? '#fff' : '#e6edf3',
                      fontWeight: isStart || isEnd ? 700 : 400,
                    }}>
                    {d}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-[#21262d]">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#21262d] text-[#8b949e]">Cancelar</button>
              <button type="button" disabled={!sel.de || !sel.ate} onClick={() => aplicar(sel)}
                className="flex-1 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ background: accent }}>Aplicar</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
