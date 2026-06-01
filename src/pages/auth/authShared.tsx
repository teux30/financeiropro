import type { ReactNode } from 'react'
import { TrendingUp } from 'lucide-react'

/** Wrapper visual compartilhado pelas telas de auth */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ background: '#0a0f0a' }}>
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1d9e75, #10b981)' }}>
            <TrendingUp size={28} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-sm mt-1" style={{ color: '#8b949e' }}>{subtitle}</p>
          </div>
        </div>
        <div className="rounded-2xl p-6 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          {children}
        </div>
        <p className="text-center text-xs" style={{ color: '#484f58' }}>Finance Pro · seus dados protegidos na nuvem</p>
      </div>
    </div>
  )
}

export function AuthInput({
  label, type = 'text', value, onChange, placeholder, autoFocus, rightSlot, inputMode, autoComplete,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  rightSlot?: ReactNode
  inputMode?: 'text' | 'email' | 'numeric'
  autoComplete?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: '#8b949e' }}>{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className="w-full bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#1d9e75] transition-colors"
          style={{ paddingRight: rightSlot ? 40 : undefined, minHeight: 44 }}
        />
        {rightSlot && <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
    </div>
  )
}

export function AuthButton({
  children, onClick, loading, variant = 'primary', type = 'button', disabled,
}: {
  children: ReactNode
  onClick?: () => void
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'google'
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const styles = {
    primary: { background: '#1d9e75', color: '#fff', border: 'none' },
    secondary: { background: 'transparent', color: '#8b949e', border: '1px solid #30363d' },
    google: { background: '#fff', color: '#1f2937', border: 'none' },
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-60"
      style={{ ...styles, minHeight: 44 }}
    >
      {loading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}

export function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.7 34.6 27 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.6 5.6C41.4 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  )
}

/** Avalia força da senha: 0-4 */
export function forcaSenha(s: string): { score: number; label: string; cor: string } {
  let score = 0
  if (s.length >= 8) score++
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) score++
  if (/\d/.test(s)) score++
  if (/[^a-zA-Z0-9]/.test(s)) score++
  const labels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte']
  const cores = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']
  return { score, label: labels[score], cor: cores[score] }
}

/** Senha forte = mín 8 caracteres com letras e números */
export function senhaValida(s: string): boolean {
  return s.length >= 8 && /[a-zA-Z]/.test(s) && /\d/.test(s)
}
