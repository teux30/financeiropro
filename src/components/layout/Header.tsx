import { TrendingUp, User, Building2, ArrowLeftRight, Settings, LogOut } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useAuthStore } from '../../store/useAuthStore'
import { isSupabaseConfigured } from '../../lib/supabase'
import { SyncStatus } from '../SyncStatus'

interface HeaderProps {
  onTrocarPerfil: () => void
  onOpenSettings: () => void
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export function Header({ onTrocarPerfil, onOpenSettings }: HeaderProps) {
  const { perfilAtivo, usuario, getEmpresaAtiva } = useStore()
  const logout = useAuthStore(s => s.logout)
  const empresa = getEmpresaAtiva()
  const isPessoal = perfilAtivo === 'pessoal'
  const accent = isPessoal ? '#1d9e75' : '#e8a020'
  const now = new Date()
  const mesAno = `${MESES[now.getMonth()]} ${now.getFullYear()}`
  const inicial = isPessoal
    ? (usuario.nome?.charAt(0) ?? 'U').toUpperCase()
    : (empresa?.logoInicial ?? 'E')

  return (
    <header
      className="flex items-center justify-between shrink-0 sticky top-0 z-30"
      style={{
        background: 'rgba(13,17,23,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${accent}33`,
        transition: 'border-color 300ms ease',
        // altura visual + safe area do topo (Dynamic Island)
        paddingTop: 'var(--safe-top)',
        paddingLeft: 'calc(1rem + var(--safe-left))',
        paddingRight: 'calc(1rem + var(--safe-right))',
        height: 'calc(52px + var(--safe-top))',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}
        >
          <TrendingUp size={14} className="text-white" />
        </div>
        <span className="text-sm font-bold text-white hidden sm:block">Finance Pro</span>

        <div className="w-px h-4 bg-[#30363d] hidden sm:block" />

        <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: '#8b949e' }}>
          {isPessoal
            ? <User size={12} style={{ color: accent }} />
            : <Building2 size={12} style={{ color: accent }} />}
          <span>
            {isPessoal ? `Pessoal — ${usuario.nome}` : `Empresa — ${empresa?.nome ?? 'Empresa'}`}
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <SyncStatus />

        {!isPessoal && (
          <span
            className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
            style={{ background: '#e8a02022', color: '#e8a020', border: '1px solid #e8a02044' }}
          >
            {mesAno}
          </span>
        )}

        <button
          onClick={onTrocarPerfil}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
          style={{ color: '#8b949e' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#21262d'; (e.currentTarget as HTMLElement).style.color = '#e6edf3' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8b949e' }}
          title="Trocar perfil"
        >
          <ArrowLeftRight size={13} />
          <span className="hidden sm:inline">Trocar perfil</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: '#8b949e' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#21262d'; (e.currentTarget as HTMLElement).style.color = '#e6edf3' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8b949e' }}
          title="Configurações"
        >
          <Settings size={15} />
        </button>

        {isSupabaseConfigured && (
          <button
            onClick={() => { if (confirm('Deseja sair da sua conta?')) logout() }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#8b949e' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#21262d'; (e.currentTarget as HTMLElement).style.color = '#ef4444' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#8b949e' }}
            title="Sair"
          >
            <LogOut size={15} />
          </button>
        )}

        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white select-none"
          style={{ background: accent }}
          title={isPessoal ? usuario.nome : empresa?.nome}
        >
          {inicial}
        </div>
      </div>
    </header>
  )
}
