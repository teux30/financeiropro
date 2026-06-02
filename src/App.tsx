import { useState, useEffect, lazy, Suspense } from 'react'
import { useStore, viewPermitida } from './store/useStore'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { ProfileSelector } from './components/ProfileSelector'
import { FAB } from './components/FAB'
import { SettingsModal } from './components/ui/SettingsModal'
import { BottomNav } from './components/layout/BottomNav'
import { InstallPrompt } from './components/InstallPrompt'
import { AuthGate } from './components/AuthGate'
import { UpdateBanner } from './components/UpdateBanner'

// Páginas leves — carregadas direto
import { Dashboard } from './pages/Dashboard'
import { ProjectsPanel } from './pages/ProjectsPanel'

// Code splitting: módulos pesados carregados sob demanda (lazy)
const MindMapEditor   = lazy(() => import('./pages/MindMapEditor').then(m => ({ default: m.MindMapEditor })))
const KanbanBoard     = lazy(() => import('./pages/KanbanBoard').then(m => ({ default: m.KanbanBoard })))
const IdeaDiary       = lazy(() => import('./pages/IdeaDiary').then(m => ({ default: m.IdeaDiary })))
const SimuladorPage   = lazy(() => import('./pages/Simulador').then(m => ({ default: m.SimuladorPage })))
const DashboardEmpresa = lazy(() => import('./pages/empresa/DashboardEmpresa'))
const DREPage         = lazy(() => import('./pages/empresa/DRE'))
const FluxoCaixaPage  = lazy(() => import('./pages/empresa/FluxoCaixa').then(m => ({ default: m.FluxoCaixaPage })))
const ContasPagarPage = lazy(() => import('./pages/empresa/ContasPagar'))
const ContasReceberPage = lazy(() => import('./pages/empresa/ContasReceber'))
const IndicadoresPage = lazy(() => import('./pages/empresa/Indicadores'))
const RHPage          = lazy(() => import('./pages/empresa/RH').then(m => ({ default: m.RHPage })))
const EstoquePage     = lazy(() => import('./pages/empresa/Estoque').then(m => ({ default: m.EstoquePage })))
const EntregadoresPage = lazy(() => import('./pages/empresa/Entregadores').then(m => ({ default: m.EntregadoresPage })))
const NotasPage = lazy(() => import('./pages/NotasPage').then(m => ({ default: m.NotasPage })))
const SeparacaoPage   = lazy(() => import('./pages/Separacao').then(m => ({ default: m.SeparacaoPage })))
const ContasPage      = lazy(() => import('./pages/banco/ContasPage').then(m => ({ default: m.ContasPage })))
const ContaDetalhe    = lazy(() => import('./pages/banco/ContaDetalhe').then(m => ({ default: m.ContaDetalhe })))
const TransacoesPage  = lazy(() => import('./pages/banco/TransacoesPage').then(m => ({ default: m.TransacoesPage })))
const TransferenciasPage = lazy(() => import('./pages/banco/TransferenciasPage').then(m => ({ default: m.TransferenciasPage })))
const ControleFinanceiro = lazy(() => import('./pages/banco/ControleFinanceiro').then(m => ({ default: m.ControleFinanceiro })))

export default function App() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  )
}

function AppShell() {
  const { activeView, perfilAtivo, processarRecorrentes, setActiveView } = useStore()
  const [showProfileSelector, setShowProfileSelector] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)

  useEffect(() => { processarRecorrentes() }, [processarRecorrentes])

  // ── Guard de isolamento: bloqueia views do outro perfil ──────────────────
  // Se a view ativa não pertence ao perfil ativo, volta ao dashboard.
  useEffect(() => {
    if (!viewPermitida(activeView, perfilAtivo)) {
      setActiveView('dashboard')
    }
  }, [activeView, perfilAtivo, setActiveView])

  // Full-screen views (no header/sidebar)
  const isFullScreen = activeView === 'editor' || activeView === 'kanban'

  const renderPage = () => {
    // isolamento: nunca renderiza view de outro perfil (mostra dashboard até o guard corrigir)
    if (!viewPermitida(activeView, perfilAtivo)) return <Dashboard />
    switch (activeView) {
      // Personal
      case 'dashboard':    return <Dashboard />
      case 'projects':     return <ProjectsPanel />
      case 'editor':       return <MindMapEditor />
      case 'kanban':       return <KanbanBoard />
      case 'diary':        return <IdeaDiary />
      case 'simulador':    return <SimuladorPage />
      // Business
      case 'empresa_dashboard':    return <DashboardEmpresa />
      case 'empresa_dre':          return <DREPage />
      case 'empresa_fluxo':        return <FluxoCaixaPage />
      case 'empresa_pagar':        return <ContasPagarPage />
      case 'empresa_receber':      return <ContasReceberPage />
      case 'empresa_indicadores':  return <IndicadoresPage />
      case 'empresa_rh':           return <RHPage />
      case 'empresa_estoque':      return <EstoquePage />
      case 'empresa_entregadores': return <EntregadoresPage />
      // Banking (both profiles)
      case 'contas':          return <ContasPage />
      case 'conta_detalhe':   return <ContaDetalhe />
      case 'transacoes':      return <TransacoesPage />
      case 'transferencias':  return <TransferenciasPage />
      case 'controle_financeiro': return <ControleFinanceiro />
      // Shared
      case 'separacao':    return <SeparacaoPage />
      case 'notas':        return <NotasPage />
      default:
        return <Dashboard />
    }
  }

  const accent = perfilAtivo === 'pessoal' ? '#1d9e75' : '#e8a020'

  if (showProfileSelector) {
    return (
      <>
        <ProfileSelector onSelect={() => setShowProfileSelector(false)} />
        <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      </>
    )
  }

  if (isFullScreen) {
    return (
      <div className="flex w-full overflow-hidden" style={{ background: '#0a0f0a', height: '100dvh' }}>
        <Suspense fallback={<PageFallback />}>{renderPage()}</Suspense>
        <FAB />
        <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    )
  }

  return (
    <div
      className="flex w-full overflow-hidden"
      style={{
        background: '#0a0f0a',
        height: '100dvh',
        // Sidebar accent color passed via CSS variable
        ['--accent' as string]: accent,
      }}
    >
      {/* Desktop sidebar */}
      <Sidebar
        className="hidden md:flex"
        onTrocarPerfil={() => setShowProfileSelector(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Mobile drawer */}
      {mobileMenu && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenu(false)} />
          <div className="relative animate-[slidein_200ms_ease]">
            <Sidebar
              onTrocarPerfil={() => { setMobileMenu(false); setShowProfileSelector(true) }}
              onOpenSettings={() => { setMobileMenu(false); setShowSettings(true) }}
              onNavigate={() => setMobileMenu(false)}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onTrocarPerfil={() => setShowProfileSelector(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto scroll-area">
          <Suspense fallback={<PageFallback />}>{renderPage()}</Suspense>
        </main>
      </div>

      {/* Desktop FAB (quick idea) hidden on mobile to avoid clash with bottom nav */}
      <div className="hidden md:block"><FAB /></div>

      {/* Mobile bottom nav */}
      <BottomNav
        onMore={() => setMobileMenu(true)}
        onNovaTransacao={() => setActiveView('transacoes')}
      />

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <InstallPrompt />
      <UpdateBanner />
    </div>
  )
}

function PageFallback() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: '#0a0f0a' }}>
      <span className="inline-block w-6 h-6 border-2 border-[#1d9e75] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
