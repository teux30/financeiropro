import { useState, useRef, useEffect } from 'react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format: (v: number) => string
  parse: (s: string) => number
  onChange: (v: number) => void
}

export function SliderInput({ label, value, min, max, step = 1, format, parse, onChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const pct = ((value - min) / (max - min)) * 100

  useEffect(() => { if (editing) { setDraft(String(value)); inputRef.current?.focus(); inputRef.current?.select() } }, [editing, value])

  const commit = () => {
    const v = Math.min(max, Math.max(min, parse(draft)))
    if (!isNaN(v)) onChange(v)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-[#8b949e] w-44 shrink-0">{label}</span>
      <div className="flex-1 relative">
        <div className="relative h-2 rounded-full bg-[#21262d]">
          <div
            className="absolute h-full rounded-full"
            style={{ width: `${pct}%`, background: '#10b981' }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
            style={{ zIndex: 2 }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#10b981] shadow pointer-events-none"
            style={{ left: `calc(${pct}% - 8px)`, zIndex: 1 }}
          />
        </div>
      </div>
      <div className="w-28 text-right shrink-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            className="w-full bg-[#161b22] border border-[#10b981] rounded px-2 py-0.5 text-sm text-right text-[#e6edf3] outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-semibold text-[#e6edf3] hover:text-[#10b981] transition-colors cursor-text"
            title="Clique para digitar"
          >
            {format(value)}
          </button>
        )}
      </div>
    </div>
  )
}
