import { useState } from 'react'
import { Plus, Trash2, Check } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Input, Textarea } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import type { KanbanCard, Priority, KanbanColumn } from '../../store/types'

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: 'Alta', color: '#ef4444' },
  { value: 'medium', label: 'Média', color: '#f97316' },
  { value: 'low', label: 'Baixa', color: '#22c55e' },
]

const COLUMNS: { value: KanbanColumn; label: string }[] = [
  { value: 'ideas', label: '💡 Ideias' },
  { value: 'todo', label: '📋 A Fazer' },
  { value: 'doing', label: '🔄 Em Andamento' },
  { value: 'done', label: '✅ Concluído' },
  { value: 'paused', label: '⏸️ Pausado' },
]

const nanoid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

interface Props {
  open: boolean
  onClose: () => void
  initial?: Partial<KanbanCard>
  onSave: (card: Omit<KanbanCard, 'id'>) => void
  defaultColumn?: KanbanColumn
}

export function CardModal({ open, onClose, initial, onSave, defaultColumn = 'todo' }: Props) {
  const [form, setForm] = useState<Omit<KanbanCard, 'id'>>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    priority: initial?.priority ?? 'medium',
    dueDate: initial?.dueDate ?? '',
    tags: initial?.tags ?? [],
    checklist: initial?.checklist ?? [],
    column: initial?.column ?? defaultColumn,
  })
  const [newTag, setNewTag] = useState('')
  const [newCheck, setNewCheck] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onSave(form)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar Card' : 'Novo Card'} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Título"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          required autoFocus
        />
        <Textarea
          label="Descrição"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
        />

        <div className="grid grid-cols-2 gap-3">
          {/* Priority */}
          <div>
            <label className="text-sm font-medium text-[#8b949e] block mb-1.5">Prioridade</label>
            <div className="flex gap-1.5">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border"
                  style={{
                    borderColor: form.priority === p.value ? p.color : '#30363d',
                    backgroundColor: form.priority === p.value ? `${p.color}22` : 'transparent',
                    color: form.priority === p.value ? p.color : '#8b949e',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Column */}
          <div>
            <label className="text-sm font-medium text-[#8b949e] block mb-1.5">Coluna</label>
            <select
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#1f6feb]"
              value={form.column}
              onChange={e => setForm(f => ({ ...f, column: e.target.value as KanbanColumn }))}
            >
              {COLUMNS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {/* Due date */}
        <Input
          label="Data limite"
          type="date"
          value={form.dueDate ?? ''}
          onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
        />

        {/* Tags */}
        <div>
          <label className="text-sm font-medium text-[#8b949e] block mb-1.5">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {form.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-[#1f6feb22] text-[#388bfd] text-xs rounded-full flex items-center gap-1 cursor-pointer hover:bg-[#ef444422] hover:text-[#f85149]"
                onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}
              >
                {tag} ×
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#1f6feb]"
              placeholder="Nova tag..."
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (newTag.trim()) { setForm(f => ({ ...f, tags: [...f.tags, newTag.trim()] })); setNewTag('') }
                }
              }}
            />
            <Button
              type="button" size="sm"
              onClick={() => { if (newTag.trim()) { setForm(f => ({ ...f, tags: [...f.tags, newTag.trim()] })); setNewTag('') } }}
            >
              <Plus size={14} />
            </Button>
          </div>
        </div>

        {/* Checklist */}
        <div>
          <label className="text-sm font-medium text-[#8b949e] block mb-1.5">Checklist</label>
          <div className="flex flex-col gap-1.5 mb-2">
            {form.checklist.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    checklist: f.checklist.map(c => c.id === item.id ? { ...c, done: !c.done } : c)
                  }))}
                  className={`shrink-0 w-4 h-4 rounded flex items-center justify-center border transition-all ${item.done ? 'bg-[#1f6feb] border-[#1f6feb]' : 'border-[#30363d]'}`}
                >
                  {item.done && <Check size={10} className="text-white" strokeWidth={3} />}
                </button>
                <span className={`flex-1 text-sm ${item.done ? 'line-through text-[#484f58]' : 'text-[#e6edf3]'}`}>
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, checklist: f.checklist.filter(c => c.id !== item.id) }))}
                  className="text-[#484f58] hover:text-[#ef4444] transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#1f6feb]"
              placeholder="Nova subtarefa..."
              value={newCheck}
              onChange={e => setNewCheck(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (newCheck.trim()) {
                    setForm(f => ({ ...f, checklist: [...f.checklist, { id: nanoid(), text: newCheck.trim(), done: false }] }))
                    setNewCheck('')
                  }
                }
              }}
            />
            <Button
              type="button" size="sm"
              onClick={() => {
                if (newCheck.trim()) {
                  setForm(f => ({ ...f, checklist: [...f.checklist, { id: nanoid(), text: newCheck.trim(), done: false }] }))
                  setNewCheck('')
                }
              }}
            >
              <Plus size={14} />
            </Button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" variant="primary" className="flex-1">Salvar</Button>
        </div>
      </form>
    </Modal>
  )
}
