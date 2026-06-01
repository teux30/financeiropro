import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { authService } from '../services/authService'
import { isSupabaseConfigured } from '../lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean          // true enquanto verifica sessão inicial
  isAuthenticated: boolean
  recoveryMode: boolean      // usuário chegou via link de redefinição de senha
  initialized: boolean

  init: () => Promise<void>
  setSession: (session: Session | null) => void
  setRecoveryMode: (v: boolean) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  recoveryMode: false,
  initialized: false,

  init: async () => {
    if (get().initialized) return
    set({ initialized: true })

    // Sem Supabase configurado: libera o app em modo local.
    if (!isSupabaseConfigured) {
      set({ loading: false, isAuthenticated: false })
      return
    }

    // Detecta retorno do link de recuperação de senha
    const params = new URLSearchParams(window.location.search)
    const hash = window.location.hash
    if (params.get('recovery') === '1' || hash.includes('type=recovery')) {
      set({ recoveryMode: true })
    }

    const session = await authService.getSession()
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      loading: false,
    })

    // Mantém o store em sincronia com mudanças de auth (login/logout/refresh)
    authService.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        set({ recoveryMode: true })
      }
      set({
        session: newSession,
        user: newSession?.user ?? null,
        isAuthenticated: !!newSession,
        loading: false,
      })
    })
  },

  setSession: (session) =>
    set({ session, user: session?.user ?? null, isAuthenticated: !!session }),

  setRecoveryMode: (v) => set({ recoveryMode: v }),

  logout: async () => {
    await authService.signOut()
    set({ user: null, session: null, isAuthenticated: false, recoveryMode: false })
    // limpa cache local de dados do app
    try { localStorage.removeItem('finance_pro_state') } catch { /* ignore */ }
  },
}))
