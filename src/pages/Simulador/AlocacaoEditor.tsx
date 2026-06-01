import { Plus, X, AlertTriangle } from 'lucide-react'
import { EditableLabel } from './EditableLabel'
import type { SimAlocacao } from '../../store/useStore'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4']

const nanoid = () => Math.random().toString(36).slice(2, 9)

interface Props {
  alocacao: SimAlocacao[]
  onChange: (list: SimAlocacao[]) => void
}

export function AlocacaoEditor({ alocacao, onChange }: Props) {
  const total = alocacao.reduce((s, a) => s + a.percentual, 0)
  const valid = Math.abs(total - 100) < 0.5

  const update = (id: string, patch: Partial<SimAlocacao>) =>
    onChange(alocacao.map(a => a.id === id ? { ...a, ...patch } : a))

  const add = () => {
    const usedColors = new Set(alocacao.map(a => a.cor))
    const cor = COLORS.find(c => !usedColors.has(c)) ?? COLORS[0]
    onChange([...alocacao, { id: nanoid(), nome: 'Nova categoria', percentual: 0, cor }])
  }

  const remove = (id: string) => onChange(alocacao.filter(a => a.id !== id))

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-[#e6edf3]">Alocação sugerida da carteira</h2>
        <button
          onClick={add}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors"
        >
          <Plus size={13} /> Adicionar
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {alocacao.map(item => (
          <div key={item.id} className="flex items-center gap-3 group">
            {/* Color dot */}
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.cor }} />

            {/* Name */}
            <div className="w-44 shrink-0">
              <EditableLabel
                value={item.nome}
                onChange={v => update(item.id, { nome: v })}
                className="text-sm text-[#e6edf3]"
              />
            </div>

            {/* Bar */}
            <div className="flex-1 relative h-2.5 bg-[#21262d] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${item.percentual}%`, backgroundColor: item.cor }}
              />
              <input
                type="range"
                min={0}
                max={100}
                value={item.percentual}
                onChange={e => update(item.id, { percentual: Number(e.target.value) })}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>

            {/* Percent input */}
            <div className="w-14 shrink-0">
              <input
                type="number"
                min={0}
                max={100}
                value={item.percentual}
                onChange={e => update(item.id, { percentual: Math.min(100, Math.max(0, Number(e.target.value))) })}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-2 py-0.5 text-sm text-right text-[#e6edf3] focus:outline-none focus:border-[#10b981]"
              />
            </div>
            <span className="text-xs text-[#8b949e] shrink-0">%</span>

            {/* Remove */}
            {alocacao.length > 1 && (
              <button
                onClick={() => remove(item.id)}
                className="p-1 rounded text-[#484f58] hover:text-[#ef4444] opacity-0 group-hover:opacity-100 transition-all"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Total */}
      <div className={`mt-4 flex items-center gap-2 text-sm ${valid ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
        {!valid && <AlertTriangle size={14} />}
        <span>
          Total: <strong>{total.toFixed(1)}%</strong>
          {!valid && ' — ajuste para somar 100%'}
        </span>
      </div>
    </div>
  )
}
