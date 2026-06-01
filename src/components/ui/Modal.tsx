import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className={`scroll-area glass w-full ${maxWidth} rounded-t-2xl sm:rounded-xl overflow-y-auto`}
        style={{ maxHeight: '90dvh' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between p-5 border-b border-[#30363d] sticky top-0 z-10"
          style={{ background: 'rgba(22,27,34,0.95)', backdropFilter: 'blur(8px)' }}
        >
          <h2 className="text-lg font-semibold text-[#e6edf3]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {/* padding inferior respeita a safe area no bottom-sheet mobile */}
        <div className="p-5" style={{ paddingBottom: 'calc(1.25rem + var(--safe-bottom))' }}>{children}</div>
      </div>
    </div>
  )
}
