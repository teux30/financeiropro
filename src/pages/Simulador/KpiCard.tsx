import type { ReactNode } from 'react'

interface Props {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
}

export function KpiCard({ label, value, sub }: Props) {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 flex flex-col gap-1 hover:border-[#30363d] transition-colors">
      <div className="text-xs text-[#8b949e] font-medium leading-snug">{label}</div>
      <div className="text-2xl font-bold text-[#e6edf3] leading-tight mt-1">{value}</div>
      {sub && <div className="text-xs text-[#484f58] mt-0.5">{sub}</div>}
    </div>
  )
}
