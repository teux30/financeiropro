import { Home, Wallet, Receipt, StickyNote, Menu, Plus } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { AppView } from '../../store/useStore'
import { useUiStore } from '../../store/useUiStore'
import { useKeyboardOpen } from '../../lib/useKeyboardOpen'

interface Props {
  onMore: () => void
  onNovaTransacao: () => void
}

export function BottomNav({ onMore, onNovaTransacao }: Props) {
  const { perfilAtivo, activeView, setActiveView, setActiveProject } = useStore()
  const accent = perfilAtivo === 'pessoal' ? '#1d9e75' : '#e8a020'
  const homeView: AppView = 'dashboard'
  const keyboardOpen = useKeyboardOpen()
  const modalOpen = useUiStore(s => s.modalCount > 0)

  // teclado ou modal aberto: esconde nav + FAB para não conflitarem
  if (keyboardOpen || modalOpen) return null

  const go = (v: AppView) => { setActiveProject(null); setActiveView(v) }

  const items: { view: AppView; label: string; icon: React.ElementType }[] = [
    { view: homeView, label: 'Início', icon: Home },
    { view: 'contas', label: 'Contas', icon: Wallet },
    { view: 'transacoes', label: 'Extrato', icon: Receipt },
    { view: 'notas', label: 'Notas', icon: StickyNote },
  ]

  const isActive = (v: AppView) => activeView === v

  return (
    <>
      {/* FAB nova transação — acima da bottom nav + safe area */}
      <button
        onClick={onNovaTransacao}
        className="md:hidden fixed z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{
          right: 'calc(1rem + var(--safe-right))',
          bottom: 'calc(var(--bottomnav-h) + var(--safe-bottom) + 16px)',
          background: accent,
        }}
        aria-label="Nova transação"
      >
        <Plus size={26} className="text-white" />
      </button>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-stretch"
        style={{
          background: 'rgba(10,15,10,0.95)', backdropFilter: 'blur(12px)',
          borderColor: 'rgba(255,255,255,0.08)',
          paddingBottom: 'var(--safe-bottom)',
          paddingLeft: 'var(--safe-left)',
          paddingRight: 'var(--safe-right)',
        }}
      >
        {items.map(it => {
          const Icon = it.icon
          const active = isActive(it.view)
          return (
            <button key={it.view} onClick={() => go(it.view)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
              style={{ color: active ? accent : '#8b949e' }}>
              <Icon size={20} />
              <span className="text-[10px]">{it.label}</span>
            </button>
          )
        })}
        <button onClick={onMore}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[#8b949e]">
          <Menu size={20} />
          <span className="text-[10px]">Mais</span>
        </button>
      </nav>
    </>
  )
}
