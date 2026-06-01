import { EditableLabel } from './EditableLabel'
import { fmtBRL, fmtK } from './math'

interface Props {
  labelKey: string
  defaultLabel: string
  renda: number
  patrimonio: number
  labelOverride?: string
  onLabelChange: (key: string, val: string) => void
  highlight?: boolean
  isTimeCard?: boolean
  prazoText?: string
}

export function ResultCard({
  labelKey, defaultLabel, renda, patrimonio,
  labelOverride, onLabelChange, highlight, isTimeCard, prazoText,
}: Props) {
  return (
    <div className={`bg-[#161b22] border rounded-xl p-5 flex flex-col gap-2 transition-colors ${
      highlight ? 'border-[#10b981] bg-[#10b98108]' : 'border-[#21262d] hover:border-[#30363d]'
    }`}>
      <div className="text-xs text-[#8b949e]">
        <EditableLabel
          value={labelOverride ?? defaultLabel}
          onChange={v => onLabelChange(labelKey, v)}
          className="text-xs text-[#8b949e]"
        />
      </div>
      <div className="text-2xl font-bold text-[#e6edf3]">
        {isTimeCard ? prazoText : `${fmtBRL(renda)}/mês`}
      </div>
      <div className="text-xs text-[#8b949e]">
        patrimônio: <span className="text-[#e6edf3] font-medium">{fmtK(patrimonio)}</span>
      </div>
    </div>
  )
}
