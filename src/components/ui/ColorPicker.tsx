import type { ProjectColor } from '../../store/types'
import { Check } from 'lucide-react'

export const PROJECT_COLORS: ProjectColor[] = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
]

interface Props {
  value: ProjectColor
  onChange: (c: ProjectColor) => void
}

export function ColorPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PROJECT_COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
          style={{ backgroundColor: c }}
        >
          {value === c && <Check size={14} className="text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  )
}
