import { supabase, assertSupabase } from '../lib/supabase'
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js'

export interface AuthResult {
  ok: boolean
  error?: string
  user?: User | null
  session?: Session | null
}

// ── Tradução de mensagens de erro do Supabase para PT-BR ─────────────────────
function traduzErro(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'
  if (m.includes('user already registered') || m.includes('already been registered')) return 'Este e-mail já está cadastrado.'
  if (m.includes('password should be at least')) return 'A senha deve ter ao menos 8 caracteres.'
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'E-mail inválido.'
  if (m.includes('rate limit') || m.includes('too many requests')) return 'Muitas tentativas. Aguarde um momento e tente novamente.'
  if (m.includes('network')) return 'Erro de conexão. Verifique sua internet.'
  if (m.includes('redirect') || m.includes('not allowed')) return 'URL de redirecionamento não autorizada. Verifique as configurações.'
  return msg || 'Ocorreu um erro. Tente novamente.'
}

const redirectBase = () => window.location.origin

export const authService = {
  async signUp(email: string, senha: string, nome: string): Promise<AuthResult> {
    try {
      assertSupabase()
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: { nome },
          emailRedirectTo: `${redirectBase()}/`,
        },
      })
      if (error) return { ok: false, error: traduzErro(error.message) }

      // Cria/atualiza profile (idempotente). Pode falhar silenciosamente se RLS
      // exigir sessão ativa (confirmação de e-mail pendente) — o trigger no
      // banco também cria o profile como fallback.
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          nome,
          email,
        }).then(() => {}, () => {})
      }
      return { ok: true, user: data.user, session: data.session }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? traduzErro(e.message) : 'Erro desconhecido.' }
    }
  },

  async signIn(email: string, senha: string): Promise<AuthResult> {
    try {
      assertSupabase()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) return { ok: false, error: traduzErro(error.message) }
      return { ok: true, user: data.user, session: data.session }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? traduzErro(e.message) : 'Erro desconhecido.' }
    }
  },

  async signInWithGoogle(): Promise<AuthResult> {
    try {
      assertSupabase()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${redirectBase()}/` },
      })
      if (error) return { ok: false, error: traduzErro(error.message) }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? traduzErro(e.message) : 'Erro desconhecido.' }
    }
  },

  async signOut(): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) return { ok: false, error: traduzErro(error.message) }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? traduzErro(e.message) : 'Erro desconhecido.' }
    }
  },

  async resetPassword(email: string): Promise<AuthResult> {
    try {
      assertSupabase()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectBase()}/?recovery=1`,
      })
      if (error) return { ok: false, error: traduzErro(error.message) }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? traduzErro(e.message) : 'Erro desconhecido.' }
    }
  },

  async updatePassword(novaSenha: string): Promise<AuthResult> {
    try {
      assertSupabase()
      const { data, error } = await supabase.auth.updateUser({ password: novaSenha })
      if (error) return { ok: false, error: traduzErro(error.message) }
      return { ok: true, user: data.user }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? traduzErro(e.message) : 'Erro desconhecido.' }
    }
  },

  async getSession(): Promise<Session | null> {
    try {
      const { data } = await supabase.auth.getSession()
      return data.session
    } catch {
      return null
    }
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },
}
