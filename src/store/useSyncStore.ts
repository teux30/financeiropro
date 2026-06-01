import { create } from 'zustand'

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error'

interface PendingChange {
  id: string
  table: string
  op: 'upsert' | 'delete'
  payload: Record<string, unknown>
  at: number
}

interface SyncState {
  status: SyncStatus
  online: boolean
  lastSyncAt: number | null
  pending: PendingChange[]
  setStatus: (s: SyncStatus) => void
  setOnline: (v: boolean) => void
  enqueue: (c: Omit<PendingChange, 'id' | 'at'>) => void
  clearPending: () => void
  markSynced: () => void
}

const nano = () => Math.random().toString(36).slice(2, 10)

export const useSyncStore = create<SyncState>((set) => ({
  status: 'synced',
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastSyncAt: null,
  pending: [],
  setStatus: (status) => set({ status }),
  setOnline: (online) => set({ online, status: online ? 'synced' : 'offline' }),
  enqueue: (c) => set(s => ({ pending: [...s.pending, { ...c, id: nano(), at: Date.now() }] })),
  clearPending: () => set({ pending: [] }),
  markSynced: () => set({ status: 'synced', lastSyncAt: Date.now() }),
}))

// Listeners globais de conectividade (registrados uma vez)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useSyncStore.getState().setOnline(true))
  window.addEventListener('offline', () => useSyncStore.getState().setOnline(false))
}
