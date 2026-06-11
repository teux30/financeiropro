import { useState } from 'react'
import { User, Building2, KeyRound, LogOut, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { authService } from '../services/authService'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export function MinhaContaPage() {
  const { usuario, setUsuario, empresas, empresaAtivaId, atualizarEmpresa } = useStore()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const empresa = empresas.find(e => e.id === empresaAtivaId) ?? empresas[0]
  const [nome, setNome] = useState(usuario.nome)
  const [empNome, setEmpNome] = useState(empresa?.nome ?? '')
  const [empSetor, setEmpSetor] = useState(empresa?.setor ?? '')
  const [empCnpj, setEmpCnpj] = useState(empresa?.cnpj ?? '')
  const [msg, setMsg] = useState<{ t: 'ok' | 'erro'; x: string } | null>(null)

  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const salvarPerfil = () => {
    setUsuario({ nome: nome.trim() || 'Investidor' })
    if (empresa) atualizarEmpresa(empresa.id, { nome: empNome.trim() || empresa.nome, setor: empSetor.trim(), cnpj: empCnpj.trim() || undefined })
    setMsg({ t: 'ok', x: 'Dados salvos.' })
  }

  const trocarSenha = async () => {
    if (senha.length < 6) { setMsg({ t: 'erro', x: 'A senha deve ter ao menos 6 caracteres.' }); return }
    if (senha !== senha2) { setMsg({ t: 'erro', x: 'As senhas não conferem.' }); return }
    setSalvandoSenha(true)
    const r = await authService.updatePassword(senha)
    setSalvandoSenha(false)
    if (r.error) setMsg({ t: 'erro', x: r.error })
    else { setMsg({ t: 'ok', x: 'Senha alterada com sucesso.' }); setSenha(''); setSenha2('') }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#14b8a622' }}><User size={18} style={{ color: '#14b8a6' }} /></div>
          <div>
            <h1 className="text-xl font-bold text-[#e6edf3]">Minha Conta</h1>
            <p className="text-xs text-[#8b949e]">{user?.email ?? 'conta local'}</p>
          </div>
        </div>

        {msg && (
          <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg" style={{ background: msg.t === 'ok' ? '#1d9e7515' : '#ef444415', color: msg.t === 'ok' ? '#1d9e75' : '#ef4444' }}>
            {msg.t === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {msg.x}
          </div>
        )}

        {/* Perfil */}
        <div className="rounded-2xl p-5 border flex flex-col gap-3" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2"><User size={16} style={{ color: '#1d9e75' }} /><span className="text-sm font-semibold text-[#e6edf3]">Perfil</span></div>
          <Input label="Seu nome" value={nome} onChange={e => setNome(e.target.value)} />
          {user?.email && <Input label="E-mail (login)" value={user.email} onChange={() => {}} disabled />}
        </div>

        {/* Estabelecimento */}
        {empresa && (
          <div className="rounded-2xl p-5 border flex flex-col gap-3" style={{ background: '#141a14', borderColor: '#e8a02033' }}>
            <div className="flex items-center gap-2"><Building2 size={16} style={{ color: '#e8a020' }} /><span className="text-sm font-semibold text-[#e6edf3]">Estabelecimento</span></div>
            <Input label="Nome da empresa" value={empNome} onChange={e => setEmpNome(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Setor" value={empSetor} onChange={e => setEmpSetor(e.target.value)} placeholder="Ex: Restaurante" />
              <Input label="CNPJ" value={empCnpj} onChange={e => setEmpCnpj(e.target.value)} placeholder="opcional" />
            </div>
          </div>
        )}

        <Button onClick={salvarPerfil} className="text-white self-start" style={{ background: '#14b8a6' } as React.CSSProperties}>Salvar alterações</Button>

        {/* Senha */}
        {user && (
          <div className="rounded-2xl p-5 border flex flex-col gap-3" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2"><KeyRound size={16} style={{ color: '#8b5cf6' }} /><span className="text-sm font-semibold text-[#e6edf3]">Trocar senha</span></div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nova senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} />
              <Input label="Confirmar" type="password" value={senha2} onChange={e => setSenha2(e.target.value)} />
            </div>
            <Button onClick={trocarSenha} disabled={salvandoSenha || !senha} variant="ghost" className="self-start">{salvandoSenha ? 'Salvando...' : 'Alterar senha'}</Button>
          </div>
        )}

        {/* Sair */}
        {user && (
          <button onClick={() => logout()} className="flex items-center gap-2 text-sm text-[#ef4444] hover:text-[#ff6b6b] self-start mt-2">
            <LogOut size={15} /> Sair da conta
          </button>
        )}
      </div>
    </div>
  )
}
