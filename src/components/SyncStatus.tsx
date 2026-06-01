import { Cloud, CloudOff, RefreshCw, AlertTriangle } from 'lucide-react'
import { useSyncStore } from '../store/useSyncStore'
import { isSupabaseConfigured } from '../lib/supabase'

export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const { status, online } = useSyncStore()
  if (!isSupabaseConfigured) return null

  const map = {
    synced:  { icon: Cloud,     label: 'Sincronizado',  cor: '#1d9e75' },
    syncing: { icon: RefreshCw, label: 'Sincronizando', cor: '#3b82f6' },
    offline: { icon: CloudOff,  label: 'Offline',       cor: '#8b949e' },
    error:   { icon: AlertTriangle, label: 'Erro sync', cor: '#ef4444' },
  } as const
  const eff = !online ? 'offline' : status
  const { icon: Icon, label, cor } = map[eff]

  return (
    <div className="flex items-center gap-1.5" title={label}>
      <Icon size={13} style={{ color: cor }} className={eff === 'syncing' ? 'animate-spin' : ''} />
      {!compact && <span className="text-xs hidden md:inline" style={{ color: cor }}>{label}</span>}
    </div>
  )
}
