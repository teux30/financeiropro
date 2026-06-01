import { useEffect, type ReactNode } from 'react'
import { TrendingUp } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useSyncStore } from '../store/useSyncStore'
import { isSupabaseConfigured } from '../lib/supabase'
import { dataService } from '../services/dataService'
import { AuthPage } from '../pages/auth/AuthPage'

/**
 * Porteiro de autenticação:
 * - enquanto verifica sessão → splash (evita flash de tela)
 * - sem sessão (e Supabase configurado) → telas de login/cadastro
 * - em modo recuperação de senha → tela de redefinição
 * - com sessão (ou Supabase não configurado = modo local) → app
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, recoveryMode, init, user } = useAuthStore()

  useEffect(() => { init() }, [init])

  // Inicia/encerra a sincronização com a nuvem conforme a sessão
  useEffect(() => {
    if (!isSupabaseConfigured) return
    if (isAuthenticated && user) {
      dataService.start(user.id)
      const onReconnect = () => dataService.flushPending(user.id)
      window.addEventListener('online', onReconnect)
      return () => {
        window.removeEventListener('online', onReconnect)
        dataService.stop()
      }
    }
  }, [isAuthenticated, user])

  // Atualiza indicador online/offline ao montar
  useEffect(() => {
    useSyncStore.getState().setOnline(navigator.onLine)
  }, [])

  if (loading) return <Splash />

  // Link de redefinição de senha tem prioridade
  if (recoveryMode) return <AuthPage />

  // Modo local (sem Supabase): libera o app direto
  if (!isSupabaseConfigured) return <>{children}</>

  if (!isAuthenticated) return <AuthPage />

  return <>{children}</>
}

function Splash() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4" style={{ background: '#0a0f0a' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse"
        style={{ background: 'linear-gradient(135deg, #1d9e75, #10b981)' }}>
        <TrendingUp size={32} className="text-white" />
      </div>
      <div className="flex items-center gap-2 text-sm" style={{ color: '#8b949e' }}>
        <span className="inline-block w-4 h-4 border-2 border-[#1d9e75] border-t-transparent rounded-full animate-spin" />
        Carregando Finance Pro...
      </div>
    </div>
  )
}
