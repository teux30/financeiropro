import { useState, useEffect } from 'react'
import { RefreshCw, X } from 'lucide-react'

/**
 * Banner "Nova versão disponível". Escuta o evento custom 'pwa:need-refresh'
 * disparado pelo registro do service worker (main.tsx).
 */
export function UpdateBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onNeed = () => setShow(true)
    window.addEventListener('pwa:need-refresh', onNeed)
    return () => window.removeEventListener('pwa:need-refresh', onNeed)
  }, [])

  if (!show) return null

  return (
    <div
      className="fixed left-4 right-4 z-[60] rounded-xl p-3 border flex items-center gap-3 shadow-2xl md:left-auto md:right-6 md:w-80"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)', background: '#141a14', borderColor: '#3b82f644' }}
    >
      <RefreshCw size={16} style={{ color: '#3b82f6' }} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#e6edf3]">Nova versão disponível</p>
        <p className="text-xs text-[#8b949e]">Atualize para ter as últimas melhorias.</p>
      </div>
      <button
        onClick={() => { window.dispatchEvent(new Event('pwa:do-update')); setShow(false) }}
        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white shrink-0"
        style={{ background: '#3b82f6' }}
      >
        Atualizar
      </button>
      <button onClick={() => setShow(false)} className="text-[#484f58] hover:text-[#8b949e] shrink-0"><X size={15} /></button>
    </div>
  )
}
