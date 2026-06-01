import { useState, useRef, useEffect } from 'react'
import { Pencil } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  className?: string
  as?: 'span' | 'p' | 'h2' | 'h3'
}

export function EditableLabel({ value, onChange, className = '', as: Tag = 'span' }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = () => { onChange(draft || value); setEditing(false) }
  const cancel = () => { setDraft(value); setEditing(false) }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
        className={`bg-transparent border-b border-[#10b981] outline-none ${className}`}
        style={{ minWidth: 60, width: `${Math.max(draft.length, 4) + 2}ch` }}
      />
    )
  }

  return (
    <Tag
      className={`group/label inline-flex items-center gap-1 cursor-text ${className}`}
      onDoubleClick={() => setEditing(true)}
      title="Duplo clique para editar"
    >
      {value}
      <Pencil size={11} className="opacity-0 group-hover/label:opacity-40 transition-opacity shrink-0" />
    </Tag>
  )
}
