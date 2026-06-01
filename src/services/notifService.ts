import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface NotifResult { ok: boolean; error?: string }

/**
 * Dispara um e-mail de teste chamando a Edge Function `enviar-lembretes`
 * com modo teste. A função usa a RESEND_API_KEY (secret no servidor) —
 * a chave NUNCA fica no frontend.
 */
export async function enviarLembreteTeste(email?: string): Promise<NotifResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Supabase não configurado.' }
  }
  try {
    const { data, error } = await supabase.functions.invoke('enviar-lembretes', {
      body: { teste: true, email },
    })
    if (error) return { ok: false, error: traduz(error.message) }
    if (data?.error) return { ok: false, error: traduz(String(data.error)) }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? traduz(e.message) : 'Erro ao enviar.' }
  }
}

function traduz(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('not found') || m.includes('404')) return 'Edge Function ainda não publicada. Veja NOTIFICACOES_SETUP.md.'
  if (m.includes('resend') || m.includes('api key')) return 'RESEND_API_KEY não configurada no Supabase.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão ou função indisponível.'
  return msg || 'Erro ao enviar e-mail.'
}
