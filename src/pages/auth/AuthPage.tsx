import { useState } from 'react'
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { authService } from '../../services/authService'
import { isSupabaseConfigured } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import {
  AuthShell, AuthInput, AuthButton, GoogleIcon, forcaSenha, senhaValida,
} from './authShared'

type Modo = 'login' | 'cadastro' | 'recuperar' | 'redefinir'

export function AuthPage() {
  const recoveryMode = useAuthStore(s => s.recoveryMode)
  const setRecoveryMode = useAuthStore(s => s.setRecoveryMode)
  const [modo, setModo] = useState<Modo>(recoveryMode ? 'redefinir' : 'login')

  return (
    <>
      {modo === 'login' && <Login onModo={setModo} />}
      {modo === 'cadastro' && <Cadastro onModo={setModo} />}
      {modo === 'recuperar' && <Recuperar onModo={setModo} />}
      {modo === 'redefinir' && <Redefinir onDone={() => { setRecoveryMode(false); setModo('login') }} />}
    </>
  )
}

function ConfigAviso() {
  if (isSupabaseConfigured) return null
  return (
    <div className="rounded-lg p-3 mb-4 text-xs flex items-start gap-2" style={{ background: '#3a2a0a', color: '#f5c518' }}>
      <AlertCircle size={14} className="shrink-0 mt-0.5" />
      <span>Supabase ainda não configurado. Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> em <code>.env.local</code> para ativar o login. Veja <code>AUTH_SETUP.md</code>.</span>
    </div>
  )
}

function Erro({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div className="rounded-lg p-3 text-xs flex items-center gap-2" style={{ background: '#3a1212', color: '#f87171' }}>
      <AlertCircle size={14} className="shrink-0" /> {msg}
    </div>
  )
}

function Sucesso({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div className="rounded-lg p-3 text-xs flex items-center gap-2" style={{ background: '#10291d', color: '#34d399' }}>
      <CheckCircle2 size={14} className="shrink-0" /> {msg}
    </div>
  )
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({ onModo }: { onModo: (m: Modo) => void }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [erro, setErro] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (!email || !senha) { setErro('Preencha e-mail e senha.'); return }
    setLoading(true)
    const r = await authService.signIn(email, senha)
    setLoading(false)
    if (!r.ok) setErro(r.error ?? 'Erro ao entrar.')
    // sucesso: onAuthStateChange atualiza o store e o app troca de tela
  }

  const google = async () => {
    setErro(''); setGoogleLoading(true)
    const r = await authService.signInWithGoogle()
    if (!r.ok) { setErro(r.error ?? 'Erro com Google.'); setGoogleLoading(false) }
  }

  return (
    <AuthShell title="Finance Pro" subtitle="Entre na sua conta">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ConfigAviso />
        <AuthInput label="E-mail" type="email" inputMode="email" autoComplete="email"
          value={email} onChange={setEmail} placeholder="voce@email.com" autoFocus />
        <AuthInput label="Senha" type={show ? 'text' : 'password'} autoComplete="current-password"
          value={senha} onChange={setSenha} placeholder="••••••••"
          rightSlot={
            <button type="button" onClick={() => setShow(!show)} className="text-[#8b949e] hover:text-[#e6edf3] p-1">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          } />
        <div className="flex justify-end -mt-1">
          <button type="button" onClick={() => onModo('recuperar')} className="text-xs" style={{ color: '#1d9e75' }}>
            Esqueci a senha
          </button>
        </div>
        <Erro msg={erro} />
        <AuthButton type="submit" loading={loading}>Entrar</AuthButton>

        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-[#30363d]" />
          <span className="text-xs text-[#484f58]">ou</span>
          <div className="flex-1 h-px bg-[#30363d]" />
        </div>

        <AuthButton variant="google" onClick={google} loading={googleLoading}>
          <GoogleIcon /> Entrar com Google
        </AuthButton>

        <p className="text-center text-sm text-[#8b949e] mt-1">
          Não tem conta?{' '}
          <button type="button" onClick={() => onModo('cadastro')} className="font-medium" style={{ color: '#1d9e75' }}>
            Cadastre-se
          </button>
        </p>
      </form>
    </AuthShell>
  )
}

// ── CADASTRO ──────────────────────────────────────────────────────────────────
function Cadastro({ onModo }: { onModo: (m: Modo) => void }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [show, setShow] = useState(false)
  const [aceite, setAceite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const forca = forcaSenha(senha)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(''); setSucesso('')
    if (!nome.trim()) { setErro('Informe seu nome.'); return }
    if (!senhaValida(senha)) { setErro('A senha deve ter no mínimo 8 caracteres com letras e números.'); return }
    if (senha !== confirma) { setErro('As senhas não coincidem.'); return }
    if (!aceite) { setErro('Você precisa aceitar os termos de uso.'); return }
    setLoading(true)
    const r = await authService.signUp(email, senha, nome.trim())
    setLoading(false)
    if (!r.ok) { setErro(r.error ?? 'Erro ao cadastrar.'); return }
    if (r.session) {
      setSucesso('Conta criada! Entrando...')
    } else {
      setSucesso('Conta criada! Confirme seu e-mail para entrar.')
    }
  }

  return (
    <AuthShell title="Criar conta" subtitle="Comece a organizar suas finanças">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <ConfigAviso />
        <AuthInput label="Nome" value={nome} onChange={setNome} placeholder="Seu nome" autoFocus autoComplete="name" />
        <AuthInput label="E-mail" type="email" inputMode="email" autoComplete="email"
          value={email} onChange={setEmail} placeholder="voce@email.com" />
        <AuthInput label="Senha" type={show ? 'text' : 'password'} autoComplete="new-password"
          value={senha} onChange={setSenha} placeholder="mín. 8 caracteres"
          rightSlot={
            <button type="button" onClick={() => setShow(!show)} className="text-[#8b949e] hover:text-[#e6edf3] p-1">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          } />
        {/* indicador de força */}
        {senha && (
          <div className="-mt-2">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i < forca.score ? forca.cor : '#30363d' }} />
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: forca.cor }}>{forca.label}</p>
          </div>
        )}
        <AuthInput label="Confirmar senha" type={show ? 'text' : 'password'} autoComplete="new-password"
          value={confirma} onChange={setConfirma} placeholder="repita a senha" />

        <label className="flex items-start gap-2 text-xs text-[#8b949e] cursor-pointer">
          <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)}
            className="accent-[#1d9e75] w-4 h-4 mt-0.5" />
          <span>Li e aceito os termos de uso e a política de privacidade.</span>
        </label>

        <Erro msg={erro} />
        <Sucesso msg={sucesso} />
        <AuthButton type="submit" loading={loading}>Criar conta</AuthButton>

        <p className="text-center text-sm text-[#8b949e]">
          Já tem conta?{' '}
          <button type="button" onClick={() => onModo('login')} className="font-medium" style={{ color: '#1d9e75' }}>
            Entrar
          </button>
        </p>
      </form>
    </AuthShell>
  )
}

// ── RECUPERAR SENHA ───────────────────────────────────────────────────────────
function Recuperar({ onModo }: { onModo: (m: Modo) => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(''); setSucesso('')
    if (!email) { setErro('Informe seu e-mail.'); return }
    setLoading(true)
    const r = await authService.resetPassword(email)
    setLoading(false)
    if (!r.ok) { setErro(r.error ?? 'Erro.'); return }
    setSucesso('Enviamos um link de redefinição para seu e-mail.')
  }

  return (
    <AuthShell title="Recuperar senha" subtitle="Enviaremos um link por e-mail">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <button type="button" onClick={() => onModo('login')} className="flex items-center gap-1 text-xs self-start" style={{ color: '#8b949e' }}>
          <ArrowLeft size={14} /> Voltar ao login
        </button>
        <ConfigAviso />
        <AuthInput label="E-mail" type="email" inputMode="email" autoComplete="email"
          value={email} onChange={setEmail} placeholder="voce@email.com" autoFocus />
        <Erro msg={erro} />
        <Sucesso msg={sucesso} />
        <AuthButton type="submit" loading={loading}>Enviar link</AuthButton>
      </form>
    </AuthShell>
  )
}

// ── REDEFINIR SENHA (via link do e-mail) ──────────────────────────────────────
function Redefinir({ onDone }: { onDone: () => void }) {
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const forca = forcaSenha(senha)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(''); setSucesso('')
    if (!senhaValida(senha)) { setErro('A senha deve ter no mínimo 8 caracteres com letras e números.'); return }
    if (senha !== confirma) { setErro('As senhas não coincidem.'); return }
    setLoading(true)
    const r = await authService.updatePassword(senha)
    setLoading(false)
    if (!r.ok) { setErro(r.error ?? 'Erro.'); return }
    setSucesso('Senha redefinida! Você já pode entrar.')
    setTimeout(onDone, 1500)
  }

  return (
    <AuthShell title="Nova senha" subtitle="Defina uma nova senha de acesso">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <AuthInput label="Nova senha" type={show ? 'text' : 'password'} autoComplete="new-password"
          value={senha} onChange={setSenha} placeholder="mín. 8 caracteres" autoFocus
          rightSlot={
            <button type="button" onClick={() => setShow(!show)} className="text-[#8b949e] hover:text-[#e6edf3] p-1">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          } />
        {senha && (
          <div className="-mt-2">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i < forca.score ? forca.cor : '#30363d' }} />
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: forca.cor }}>{forca.label}</p>
          </div>
        )}
        <AuthInput label="Confirmar senha" type={show ? 'text' : 'password'} autoComplete="new-password"
          value={confirma} onChange={setConfirma} placeholder="repita a senha" />
        <Erro msg={erro} />
        <Sucesso msg={sucesso} />
        <AuthButton type="submit" loading={loading}>Salvar nova senha</AuthButton>
      </form>
    </AuthShell>
  )
}
