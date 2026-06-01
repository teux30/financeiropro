import { useState } from 'react'
import { Input, Textarea } from './Input'
import { ColorPicker, PROJECT_COLORS } from './ColorPicker'
import { ProjectIcon } from './ProjectIcon'
import { Button } from './Button'
import type { ProjectColor, ProjectIcon as ProjectIconType, ProjectType } from '../../store/types'

const ICONS: ProjectIconType[] = [
  'Lightbulb', 'Rocket', 'Target', 'TrendingUp', 'Brain',
  'Star', 'Zap', 'Heart', 'Globe', 'Code',
]

const TYPES: { value: ProjectType; label: string }[] = [
  { value: 'idea', label: 'Ideia Livre' },
  { value: 'structured', label: 'Projeto Estruturado' },
  { value: 'planning', label: 'Planejamento' },
  { value: 'study', label: 'Estudo' },
  { value: 'business', label: 'Negócio' },
]

interface FormData {
  title: string
  description: string
  color: ProjectColor
  icon: ProjectIconType
  type: ProjectType
}

interface Props {
  initial?: Partial<FormData>
  onSubmit: (data: FormData) => void
  onCancel: () => void
  submitLabel?: string
}

export function ProjectForm({ initial, onSubmit, onCancel, submitLabel = 'Criar Projeto' }: Props) {
  const [form, setForm] = useState<FormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    color: initial?.color ?? PROJECT_COLORS[0],
    icon: initial?.icon ?? 'Brain',
    type: initial?.type ?? 'idea',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Nome do Projeto"
        placeholder="Ex: App de Finanças"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        required
        autoFocus
      />
      <Textarea
        label="Descrição"
        placeholder="O que é este projeto?"
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        rows={3}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#8b949e]">Cor</label>
        <ColorPicker value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#8b949e]">Ícone</label>
        <div className="flex gap-2 flex-wrap">
          {ICONS.map(icon => (
            <button
              key={icon}
              type="button"
              onClick={() => setForm(f => ({ ...f, icon }))}
              className={`p-2 rounded-lg transition-all ${
                form.icon === icon
                  ? 'text-white'
                  : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
              }`}
              style={form.icon === icon ? { backgroundColor: form.color } : {}}
            >
              <ProjectIcon icon={icon} size={18} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#8b949e]">Tipo</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setForm(f => ({ ...f, type: t.value }))}
              className={`py-2 px-3 rounded-lg text-sm text-left transition-all border ${
                form.type === t.value
                  ? 'border-[#1f6feb] bg-[#1f6feb1a] text-[#e6edf3]'
                  : 'border-[#30363d] text-[#8b949e] hover:border-[#484f58] hover:text-[#e6edf3]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" variant="primary" className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
