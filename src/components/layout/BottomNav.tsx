import { Home, Wallet, Receipt, ArrowLeftRight, Menu, Plus } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { AppView } from '../../store/useStore'

interface Props {
  onMore: () => void
  onNovaTransacao: () => void
}

export function BottomNav({ onMore, onNovaTransacao }: Props) {
  const { perfilAtivo, activeView, setActiveView, setActiveProject } = useStore()
  const accent = perfilAtivo === 'pessoal' ? '#1d9e75' : '#e8a020'
  const homeView: AppView = 'dashboard'

  const go = (v: AppView) => { setActiveProject(null); setActiveView(v) }

  const items: { view: AppView; label: string; icon: React.ElementType }[] = [
    { view: homeView, label: 'Início', icon: Home },
    { view: 'contas', label: 'Contas', icon: Wallet },
    { view: 'transacoes', label: 'Extrato', icon: Receipt },
    { view: 'transferencias', label: 'Transferir', icon: ArrowLeftRight },
  ]

  const isActive = (v: AppView) => activeView === v

  return (
    <>
      {/* FAB nova transação */}
      <button
        onClick={onNovaTransacao}
        className="md:hidden fixed right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{ bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))', background: accent }}
        aria-label="Nova transação"
      >
        <Plus size={26} className="text-white" />
      </button>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-stretch"
        style={{
          background: 'rgba(10,15,10,0.95)', backdropFilter: 'blur(12px)',
          borderColor: 'rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
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
