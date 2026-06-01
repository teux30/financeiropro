import { useEffect, useState } from 'react'
import { Download, X, Share, Plus } from 'lucide-react'

interface BIPEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  const ua = window.navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua) // Safari iOS
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [showIOS, setShowIOS] = useState(false)

  useEffect(() => {
    if (isStandalone()) return // já instalado → nunca mostra

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
      if (!sessionStorage.getItem('pwa-dismissed')) setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS não dispara o evento — mostra instruções manuais
    if (isIOS() && !sessionStorage.getItem('pwa-dismissed')) {
      const t = setTimeout(() => setShowIOS(true), 3000)
      return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', handler) }
    }
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    sessionStorage.setItem('pwa-dismissed', '1')
    setVisible(false)
    setShowIOS(false)
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setVisible(false)
    setDeferred(null)
  }

  // iOS — instruções "Compartilhar → Adicionar à Tela de Início"
  if (showIOS) {
    return (
      <div
        className="fixed left-4 right-4 z-50 rounded-2xl p-4 border shadow-2xl md:left-auto md:right-6 md:w-80"
        style={{ bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', background: '#141a14', borderColor: '#1d9e7544' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#1d9e7522' }}>
            <Download size={18} style={{ color: '#1d9e75' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#e6edf3]">Instalar no iPhone</p>
            <p className="text-xs text-[#8b949e] mt-1 flex items-center gap-1 flex-wrap">
              Toque em <Share size={13} className="inline" style={{ color: '#3b82f6' }} /> <strong>Compartilhar</strong>, depois
              <Plus size={13} className="inline" /> <strong>Adicionar à Tela de Início</strong>.
            </p>
          </div>
          <button onClick={dismiss} className="text-[#484f58] hover:text-[#8b949e] shrink-0"><X size={16} /></button>
        </div>
      </div>
    )
  }

  if (!visible || !deferred) return null

  return (
    <div
      className="fixed left-4 right-4 z-50 rounded-2xl p-4 border flex items-center gap-3 shadow-2xl md:left-auto md:right-6 md:w-80"
      style={{ bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', background: '#141a14', borderColor: '#1d9e7544' }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#1d9e7522' }}>
        <Download size={18} style={{ color: '#1d9e75' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#e6edf3]">Instalar Finance Pro</p>
        <p className="text-xs text-[#8b949e]">Adicione à tela inicial para acesso rápido</p>
      </div>
      <button onClick={install} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white shrink-0" style={{ background: '#1d9e75' }}>
        Instalar
      </button>
      <button onClick={dismiss} className="text-[#484f58] hover:text-[#8b949e] shrink-0"><X size={16} /></button>
    </div>
  )
}
