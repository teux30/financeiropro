import {
  LayoutDashboard, Calculator, Brain, BookOpen, ArrowLeftRight,
  BarChart3, Package, Users, Activity,
  ArrowDownCircle, ArrowUpCircle, TrendingUp, ChevronRight,
  Settings, Wallet, Receipt, CreditCard, Building2, Bike, StickyNote, Truck, UtensilsCrossed, Percent,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { AppView } from '../../store/useStore'

interface NavItem {
  id: AppView
  label: string
  icon: React.ElementType
  badge?: number
}

interface NavSection {
  title: string
  items: NavItem[]
}

const PESSOAL_NAV: NavSection[] = [
  {
    title: 'Visão',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Banco',
    items: [
      { id: 'contas', label: 'Minhas Contas', icon: Wallet },
      { id: 'transacoes', label: 'Transações', icon: Receipt },
      { id: 'transferencias', label: 'Transferências', icon: ArrowLeftRight },
      { id: 'controle_financeiro', label: 'Controle Financeiro', icon: CreditCard },
      { id: 'cartoes', label: 'Cartões', icon: CreditCard },
    ],
  },
  {
    title: 'Investimentos',
    items: [
      { id: 'simulador', label: 'Simulador', icon: Calculator },
    ],
  },
  {
    title: 'Planejamento',
    items: [
      { id: 'notas', label: 'Bloco de Notas', icon: StickyNote },
      { id: 'projects', label: 'Mapa Mental', icon: Brain },
      { id: 'diary', label: 'Diário de Ideias', icon: BookOpen },
    ],
  },
  {
    title: 'Integração',
    items: [
      { id: 'separacao', label: 'Pessoal vs Empresa', icon: ArrowLeftRight },
    ],
  },
]

const EMPRESA_NAV: NavSection[] = [
  {
    title: 'Visão',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Visão Geral',
    items: [
      { id: 'empresa_dashboard', label: 'Painel da Empresa', icon: Building2 },
      { id: 'empresa_dre', label: 'DRE — Resultado', icon: BarChart3 },
      { id: 'empresa_fluxo', label: 'Fluxo de Caixa', icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Banco',
    items: [
      { id: 'contas', label: 'Minhas Contas', icon: Wallet },
      { id: 'transacoes', label: 'Transações', icon: Receipt },
      { id: 'transferencias', label: 'Transferências', icon: ArrowLeftRight },
      { id: 'controle_financeiro', label: 'Controle Financeiro', icon: CreditCard },
      { id: 'cartoes', label: 'Cartões', icon: CreditCard },
    ],
  },
  {
    title: 'Operacional',
    items: [
      { id: 'empresa_pagar', label: 'Contas a Pagar', icon: ArrowDownCircle },
      { id: 'empresa_receber', label: 'Contas a Receber', icon: ArrowUpCircle },
      { id: 'empresa_cardapio', label: 'Cardápio', icon: UtensilsCrossed },
      { id: 'empresa_precificador', label: 'Precificador', icon: Calculator },
      { id: 'empresa_estoque', label: 'Estoque', icon: Package },
      { id: 'empresa_cmv', label: 'CMV', icon: Percent },
      { id: 'empresa_fornecedores', label: 'Fornecedores', icon: Truck },
    ],
  },
  {
    title: 'Equipe',
    items: [
      { id: 'empresa_rh', label: 'RH e Funcionários', icon: Users },
      { id: 'empresa_entregadores', label: 'Entregadores', icon: Bike },
    ],
  },
  {
    title: 'Indicadores',
    items: [
      { id: 'empresa_indicadores', label: 'KPIs do Negócio', icon: Activity },
    ],
  },
  {
    title: 'Planejamento',
    items: [
      { id: 'notas', label: 'Bloco de Notas', icon: StickyNote },
      { id: 'projects', label: 'Mapa Mental', icon: Brain },
      { id: 'separacao', label: 'Separação Financeira', icon: TrendingUp },
    ],
  },
]

interface SidebarProps {
  onTrocarPerfil: () => void
  onOpenSettings: () => void
  onNavigate?: () => void
  className?: string
}

export function Sidebar({ onTrocarPerfil, onOpenSettings, onNavigate, className = '' }: SidebarProps) {
  const { perfilAtivo, activeView, setActiveView, setActiveProject, projects } = useStore()
  const isPessoal = perfilAtivo === 'pessoal'
  const accent = isPessoal ? '#1d9e75' : '#e8a020'
  const nav = isPessoal ? PESSOAL_NAV : EMPRESA_NAV
  const activeProjects = projects.filter(p => p.status === 'active').length

  const navigate = (view: AppView) => {
    setActiveProject(null)
    setActiveView(view)
    onNavigate?.()
  }

  const isActive = (id: AppView) =>
    activeView === id ||
    (id === 'projects' && (activeView === 'editor' || activeView === 'kanban'))

  return (
    <aside
      className={`flex flex-col w-60 shrink-0 border-r border-[#21262d] bg-[#0d1117] ${className}`}
      style={{ position: 'sticky', top: 0, height: '100dvh', transition: 'all 200ms ease', paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
    >
      {/* Logo */}
      <div className="p-4 border-b border-[#21262d]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}
          >
            <TrendingUp size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#e6edf3] leading-none">Finance Pro</div>
            <div className="text-xs leading-none mt-0.5 font-medium" style={{ color: accent }}>
              {isPessoal ? 'Pessoal' : 'Empresa'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {nav.map((section, si) => (
          <div key={si} className="mb-4">
            <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-[#484f58]">
              {section.title}
            </p>
            {section.items.map(item => {
              const Icon = item.icon
              const active = isActive(item.id)
              const badge = item.id === 'projects' && activeProjects > 0 ? activeProjects : (item.badge ?? null)
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-all text-left mb-0.5"
                  style={{
                    background: active ? `${accent}18` : 'transparent',
                    color: active ? accent : '#8b949e',
                    fontWeight: active ? 500 : 400,
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = '#161b22'; (e.currentTarget as HTMLElement).style.color = '#e6edf3' } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8b949e' } }}
                >
                  <Icon size={15} />
                  <span className="flex-1">{item.label}</span>
                  {badge !== null && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: `${accent}33`, color: accent }}
                    >
                      {badge}
                    </span>
                  )}
                  {active && <ChevronRight size={13} />}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-[#21262d] flex flex-col gap-1">
        <button
          onClick={onTrocarPerfil}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3] transition-all"
        >
          <ArrowLeftRight size={15} />
          <span className="flex-1">Trocar perfil</span>
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: accent }}
            title={isPessoal ? 'Pessoal' : 'Empresa'}
          />
        </button>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3] transition-all"
        >
          <Settings size={15} />
          <span>Configurações</span>
        </button>
      </div>
    </aside>
  )
}
