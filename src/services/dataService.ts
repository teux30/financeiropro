import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useSyncStore } from '../store/useSyncStore'
import { useStore } from '../store/useStore'

/**
 * Estratégia de sincronização (pragmática e robusta):
 *
 * O app já mantém TODO o estado em um único blob persistido pelo Zustand
 * (`finance_pro_state` no localStorage). Em vez de espelhar 15 tabelas no
 * cliente, guardamos esse snapshot na linha do usuário em `profiles.data`
 * (coluna jsonb) — fonte da verdade na nuvem — e usamos Realtime para
 * propagar mudanças entre dispositivos (PC ↔ celular).
 *
 * As 15 tabelas do schema.sql existem com RLS para quem quiser evoluir para
 * um modelo relacional/colunar no futuro; este serviço cobre o requisito de
 * "dados na nuvem, acessíveis de qualquer rede, em tempo real".
 *
 * Conflitos: last-write-wins por timestamp (`updated_at`).
 */

const SNAPSHOT_KEY = 'finance_pro_state'
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null
let unsubStore: (() => void) | null = null
let applyingRemote = false
let lastPushedAt = 0

function getLocalSnapshot(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state ?? parsed // zustand persist envolve em { state, version }
  } catch {
    return null
  }
}

/** Aplica um snapshot remoto no store local (sem redisparar push). */
/**
 * Um snapshot só é considerado "real" se contiver dados do app.
 * Evita que um registro vazio ({} ) na nuvem apague o estado local.
 */
function snapshotTemConteudo(state: Record<string, unknown> | null | undefined): boolean {
  if (!state || typeof state !== 'object') return false
  const empresas = (state as { empresas?: unknown[] }).empresas
  const temEmpresas = Array.isArray(empresas) && empresas.length > 0
  const temPerfil = 'perfilAtivo' in state
  const temProjetos = Array.isArray((state as { projects?: unknown[] }).projects)
  return temEmpresas || temPerfil || temProjetos
}

function applySnapshot(state: Record<string, unknown>) {
  if (!snapshotTemConteudo(state)) return // proteção: nunca aplica vazio
  applyingRemote = true
  try {
    useStore.setState(state as never)
    const envelope = { state, version: 0 }
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(envelope))
  } finally {
    setTimeout(() => { applyingRemote = false }, 0)
  }
}

async function pull(userId: string): Promise<{ data: Record<string, unknown>; updatedAt: number } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('data, updated_at')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data?.data) return null
  const snap = data.data as Record<string, unknown>
  // nuvem "vazia" (registro recém-criado) = trata como inexistente
  if (!snapshotTemConteudo(snap)) return null
  return { data: snap, updatedAt: new Date(data.updated_at).getTime() }
}

async function push(userId: string) {
  const snap = getLocalSnapshot()
  if (!snap) return
  const sync = useSyncStore.getState()
  if (!sync.online) {
    sync.enqueue({ table: 'profiles', op: 'upsert', payload: { id: userId } })
    return
  }
  sync.setStatus('syncing')
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    data: snap,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    sync.setStatus('error')
    sync.enqueue({ table: 'profiles', op: 'upsert', payload: { id: userId } })
  } else {
    lastPushedAt = Date.now()
    sync.markSynced()
  }
}

function schedulePush(userId: string) {
  if (applyingRemote) return
  if (pushTimer) clearTimeout(pushTimer)
  useSyncStore.getState().setStatus('syncing')
  pushTimer = setTimeout(() => push(userId), 1200) // debounce 1.2s (optimistic)
}

export const dataService = {
  /** Chamado após login: baixa nuvem, faz merge last-write-wins, ativa realtime. */
  async start(userId: string) {
    if (!isSupabaseConfigured) return
    const sync = useSyncStore.getState()
    sync.setOnline(navigator.onLine)

    // 1) PULL inicial — decide entre nuvem e local
    const remote = await pull(userId)               // já retorna null se nuvem vazia
    const localSnap = getLocalSnapshot()
    const localTemDados = snapshotTemConteudo(localSnap)

    if (remote && !localTemDados) {
      // só a nuvem tem dados → aplica
      applySnapshot(remote.data)
    } else if (remote && localTemDados) {
      // ambos têm dados → mais recente vence (last-write-wins)
      const localAt = Number((localSnap as { _updatedAt?: number } | null)?._updatedAt ?? 0)
      if (remote.updatedAt > localAt) applySnapshot(remote.data)
      else await push(userId)
    } else if (localTemDados) {
      // só o local tem dados (nuvem vazia) → sobe pra nuvem
      await push(userId)
    }
    sync.markSynced()

    // 2) Assina mudanças do próprio store → push com debounce
    unsubStore?.()
    unsubStore = useStore.subscribe(() => schedulePush(userId))

    // 3) Realtime: mudanças vindas de outro dispositivo
    if (realtimeChannel) supabase.removeChannel(realtimeChannel)
    realtimeChannel = supabase
      .channel(`profile-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { data?: Record<string, unknown>; updated_at?: string }
          if (!row?.data) return
          const remoteAt = row.updated_at ? new Date(row.updated_at).getTime() : 0
          // ignora o eco do nosso próprio push recente
          if (Math.abs(remoteAt - lastPushedAt) < 2500) return
          applySnapshot(row.data)
          useSyncStore.getState().markSynced()
        }
      )
      .subscribe()
  },

  /** Reenvia fila pendente ao reconectar. */
  async flushPending(userId: string) {
    const sync = useSyncStore.getState()
    if (!sync.online || sync.pending.length === 0) return
    await push(userId)
    sync.clearPending()
  },

  stop() {
    unsubStore?.()
    unsubStore = null
    if (pushTimer) clearTimeout(pushTimer)
    if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null }
  },
}
