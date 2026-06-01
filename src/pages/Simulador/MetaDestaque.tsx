import { useState, useRef, useEffect } from 'react'
import { Pencil, Target } from 'lucide-react'

interface Props {
  value: number
  onChange: (v: number) => void
}

export function MetaDestaque({ value, onChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(value === 0 ? '' : String(value))
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 0)
    }
  }, [editing, value])

  const commit = () => {
    const n = Number(draft.replace(/\D/g, ''))
    if (!isNaN(n) && n >= 0) onChange(n)
    setEditing(false)
  }

  const fmtDisplay = (v: number) =>
    v === 0 ? 'R$ 0' : `R$ ${v.toLocaleString('pt-BR')}`

  return (
    <div className="bg-gradient-to-br from-[#0d2b1e] to-[#0d1f2b] border border-[#1d9e7544] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1d9e7522', border: '1px solid #1d9e7544' }}>
          <Target size={20} style={{ color: '#1d9e75' }} />
        </div>
        <div>
          <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Minha meta de dividendos mensais</p>
          <p className="text-xs text-[#484f58]">Todos os cálculos atualizam em tempo real</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {editing ? (
          <div className="flex-1 flex items-center gap-2">
            <span className="text-3xl font-bold text-[#1d9e75]">R$</span>
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value.replace(/\D/g, ''))}
              onBlur={commit}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
              placeholder="0"
              className="flex-1 bg-transparent text-3xl font-bold text-[#1d9e75] placeholder-[#1d9e7544] outline-none border-b-2 border-[#1d9e75] min-w-0"
              style={{ caretColor: '#1d9e75' }}
            />
          </div>
        ) : (
          <button
            className="flex-1 text-left group flex items-center gap-3"
            onClick={() => setEditing(true)}
          >
            <span className="text-4xl font-black text-[#1d9e75] tracking-tight">
              {fmtDisplay(value)}
            </span>
            <span className="text-sm text-[#484f58]">/mês</span>
            <Pencil
              size={16}
              className="text-[#1d9e75] opacity-0 group-hover:opacity-60 transition-opacity"
            />
          </button>
        )}
      </div>

      {value > 0 && (
        <p className="text-xs text-[#8b949e] mt-3">
          Clique no valor para editar diretamente
        </p>
      )}
      {value === 0 && !editing && (
        <p className="text-sm text-[#484f58] mt-3 italic">
          👆 Clique para definir sua meta e iniciar a simulação
        </p>
      )}
    </div>
  )
}
