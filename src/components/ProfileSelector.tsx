import { useState, useEffect } from 'react'
import { User, Building2, TrendingUp, Plus, ChevronRight, Check, X } from 'lucide-react'
import { useStore } from '../store/useStore'

interface Props {
  onSelect: () => void
}

const PESSOAL_MODULES = [
  'Simulador de Renda Passiva',
  'Mapas Mentais & Projetos',
  'Diário de Ideias',
  'Metas Financeiras',
  'Separação Pessoal/Empresa',
]

const EMPRESA_MODULES = [
  'DRE — Resultado do Período',
  'Fluxo de Caixa Diário',
  'Contas a Pagar e Receber',
  'KPIs e Indicadores',
  'RH e Folha de Pagamento',
  'Estoque e Insumos',
]

export function ProfileSelector({ onSelect }: Props) {
  const { perfilAtivo, setPerfilAtivo, setActiveView, empresas, adicionarEmpresa, simulacoesSalvas, projects } = useStore()
  const [visible, setVisible] = useState(false)
  const [showAddEmpresa, setShowAddEmpresa] = useState(false)
  const [newNome, setNewNome] = useState('')
  const [newSetor, setNewSetor] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const select = (perfil: 'pessoal' | 'empresa') => {
    setPerfilAtivo(perfil)
    // Dashboard é unificado: ambos os perfis abrem na mesma tela consolidada
    setActiveView('dashboard')
    onSelect()
  }

  const addEmpresa = () => {
    if (!newNome.trim()) return
    adicionarEmpresa({ nome: newNome.trim(), setor: newSetor.trim() || 'Geral' })
    setShowAddEmpresa(false)
    setNewNome('')
    setNewSetor('')
  }

  const empresa = empresas[0]
  const pessoalBadge = simulacoesSalvas.length + projects.length
  const empresaBadge = empresa ? empresa.fluxoCaixa.length + empresa.contasPagar.length : 0

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-6 overflow-y-auto"
      style={{ background: '#0a0f0a' }}
    >
      {/* Logo */}
      <div
        className="flex flex-col items-center mb-10"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'opacity 400ms ease, transform 400ms ease',
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #1d9e75, #10b981)' }}
        >
          <TrendingUp size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Finance Pro</h1>
        <p className="text-sm mt-2" style={{ color: '#8b949e' }}>
          Selecione seu perfil para continuar
        </p>
      </div>

      {/* Cards */}
      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-2xl">
        {/* Pessoal */}
        <button
          onClick={() => select('pessoal')}
          className="group flex-1 text-left rounded-2xl p-6 border transition-all duration-200 hover:scale-[1.02]"
          style={{
            background: '#141a14',
            borderColor: perfilAtivo === 'pessoal' ? '#1d9e75' : 'rgba(255,255,255,0.08)',
            boxShadow: 'none',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 400ms ease 100ms, transform 400ms ease 100ms, box-shadow 200ms, border-color 200ms, transform 200ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px #1d9e75, 0 8px 32px rgba(29,158,117,0.15)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = perfilAtivo === 'pessoal' ? '#1d9e75' : 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: '#1d9e7522', border: '1px solid #1d9e7544' }}
            >
              <User size={22} style={{ color: '#1d9e75' }} />
            </div>
            <div className="flex items-center gap-1.5">
              {pessoalBadge > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#1d9e7522', color: '#1d9e75' }}>
                  {pessoalBadge} registros
                </span>
              )}
              <ChevronRight size={16} style={{ color: '#1d9e75' }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Pessoal</h2>
          <p className="text-xs mb-4" style={{ color: '#8b949e' }}>
            Investimentos, renda passiva e finanças pessoais
          </p>
          <ul className="flex flex-col gap-1.5">
            {PESSOAL_MODULES.map(m => (
              <li key={m} className="flex items-center gap-2 text-xs" style={{ color: '#8b949e' }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#1d9e75' }} />
                {m}
              </li>
            ))}
          </ul>
        </button>

        {/* Empresa */}
        <button
          onClick={() => select('empresa')}
          className="group flex-1 text-left rounded-2xl p-6 border transition-all duration-200 hover:scale-[1.02]"
          style={{
            background: '#141a14',
            borderColor: perfilAtivo === 'empresa' ? '#e8a020' : 'rgba(255,255,255,0.08)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 400ms ease 200ms, transform 400ms ease 200ms, box-shadow 200ms, border-color 200ms',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px #e8a020, 0 8px 32px rgba(232,160,32,0.15)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = perfilAtivo === 'empresa' ? '#e8a020' : 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: '#e8a02022', border: '1px solid #e8a02044' }}
            >
              <Building2 size={22} style={{ color: '#e8a020' }} />
            </div>
            <div className="flex items-center gap-1.5">
              {empresaBadge > 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#e8a02022', color: '#e8a020' }}>
                  {empresaBadge} registros
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#21262d', color: '#8b949e' }}>
                  Sem dados
                </span>
              )}
              <ChevronRight size={16} style={{ color: '#e8a020' }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{empresa?.nome ?? 'Minha Empresa'}</h2>
          <p className="text-xs mb-4" style={{ color: '#8b949e' }}>
            Gestão financeira completa do negócio
          </p>
          <ul className="flex flex-col gap-1.5">
            {EMPRESA_MODULES.map(m => (
              <li key={m} className="flex items-center gap-2 text-xs" style={{ color: '#8b949e' }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#e8a020' }} />
                {m}
              </li>
            ))}
          </ul>
        </button>
      </div>

      {/* Add empresa */}
      <div
        className="mt-6 flex flex-col items-center gap-3"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 400ms ease 350ms',
        }}
      >
        {!showAddEmpresa ? (
          <button
            onClick={() => setShowAddEmpresa(true)}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: '#484f58' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#8b949e' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#484f58' }}
          >
            <Plus size={14} /> Adicionar nova empresa
          </button>
        ) : (
          <div
            className="flex flex-col gap-3 p-4 rounded-xl border w-full max-w-sm"
            style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Nova empresa</span>
              <button onClick={() => setShowAddEmpresa(false)}>
                <X size={14} style={{ color: '#8b949e' }} />
              </button>
            </div>
            <input
              autoFocus
              placeholder="Nome da empresa"
              value={newNome}
              onChange={e => setNewNome(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-[#e8a020]"
              onKeyDown={e => { if (e.key === 'Enter') addEmpresa() }}
            />
            <input
              placeholder="Setor (ex: Restaurante, Varejo...)"
              value={newSetor}
              onChange={e => setNewSetor(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-[#e8a020]"
              onKeyDown={e => { if (e.key === 'Enter') addEmpresa() }}
            />
            <button
              onClick={addEmpresa}
              className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: '#e8a020' }}
            >
              <Check size={14} /> Criar empresa
            </button>
          </div>
        )}

        <p className="text-xs" style={{ color: '#484f58' }}>
          Finance Pro v2.0 · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
