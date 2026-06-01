import { Calculator, Brain, Sparkles, ArrowRight, TrendingUp, Target, Zap } from 'lucide-react'
import { useStore } from '../store/useStore'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtPrazo = (m: number) => {
  if (!isFinite(m)) return '> 50 anos'
  const a = Math.floor(m / 12), r = m % 12
  if (a === 0) return `${r} meses`
  if (r === 0) return `${a} anos`
  return `${a}a ${r}m`
}

export function Dashboard() {
  const { simParams, simulacoesSalvas, quickIdeas, projects, setActiveView } = useStore()
  const { meta } = simParams

  const recentSims = [...simulacoesSalvas].slice(0, 3)
  const recentIdeas = [...quickIdeas].filter(i => i.status === 'new').slice(0, 3)
  const recentProjects = [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 2)
  const isEmpty = simulacoesSalvas.length === 0 && quickIdeas.length === 0 && projects.length === 0

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d1117]">
      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#e6edf3]">Dashboard Pessoal</h1>
            <p className="text-sm text-[#8b949e] mt-0.5">Visão geral das suas finanças pessoais</p>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1d9e75, #10b981)' }}
          >
            <TrendingUp size={20} className="text-white" />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Meta de renda passiva',
              value: meta > 0 ? fmtBRL(meta) : '—',
              sub: meta > 0 ? 'Configure no Simulador' : 'Defina sua meta',
              icon: Target, color: '#1d9e75',
            },
            {
              label: 'Patrimônio inicial',
              value: simParams.inicial > 0 ? fmtBRL(simParams.inicial) : '—',
              sub: simParams.inicial > 0 ? 'Aporte inicial configurado' : 'Configure no Simulador',
              icon: TrendingUp, color: '#3b82f6',
            },
            {
              label: 'Simulações salvas',
              value: String(simulacoesSalvas.length),
              sub: simulacoesSalvas.length > 0 ? 'Cenários analisados' : 'Nenhuma ainda',
              icon: Calculator, color: '#8b5cf6',
            },
            {
              label: 'Ideias capturadas',
              value: String(quickIdeas.length),
              sub: `${quickIdeas.filter(i => i.status === 'new').length} novas`,
              icon: Sparkles, color: '#f59e0b',
            },
          ].map(card => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 hover:border-[#30363d] transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-[#8b949e] font-medium leading-snug">{card.label}</p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}22` }}>
                    <Icon size={13} style={{ color: card.color }} />
                  </div>
                </div>
                <p className="text-xl font-bold text-[#e6edf3]">{card.value}</p>
                <p className="text-xs text-[#484f58] mt-0.5">{card.sub}</p>
              </div>
            )
          })}
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Calculator, label: 'Simule sua renda passiva', sub: 'Calcule quanto precisa investir', view: 'simulador' as const, color: '#1d9e75' },
              { icon: Brain, label: 'Crie seu mapa mental', sub: 'Organize suas ideias e projetos', view: 'projects' as const, color: '#3b82f6' },
              { icon: Sparkles, label: 'Capture uma ideia', sub: 'Use o botão + no canto da tela', view: 'diary' as const, color: '#f59e0b' },
            ].map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveView(item.view)}
                  className="group flex flex-col items-center text-center gap-3 p-6 bg-[#161b22] border border-[#21262d] rounded-xl hover:border-[#30363d] transition-all hover:scale-[1.02]"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}22` }}>
                    <Icon size={22} style={{ color: item.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#e6edf3]">{item.label}</p>
                    <p className="text-xs text-[#8b949e] mt-0.5">{item.sub}</p>
                  </div>
                  <ArrowRight size={14} style={{ color: item.color }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )
            })}
          </div>
        )}

        {/* Content columns */}
        {!isEmpty && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Simulations (2/3) */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#e6edf3]">Simulações recentes</h2>
                <button onClick={() => setActiveView('simulador')} className="flex items-center gap-1 text-sm text-[#1d9e75] hover:opacity-80 transition-opacity">
                  Ver todas <ArrowRight size={13} />
                </button>
              </div>
              {recentSims.length === 0 ? (
                <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6 text-center">
                  <Calculator size={28} className="mx-auto mb-2 text-[#30363d]" />
                  <p className="text-sm text-[#8b949e]">Nenhuma simulação salva ainda</p>
                  <button onClick={() => setActiveView('simulador')} className="mt-3 text-xs text-[#1d9e75] hover:opacity-80">
                    Ir ao Simulador →
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentSims.map(sim => (
                    <div key={sim.id} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 hover:border-[#30363d] transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#e6edf3] truncate">{sim.nome}</p>
                          <p className="text-xs text-[#8b949e] mt-0.5">
                            Meta: <span style={{ color: '#1d9e75' }}>{fmtBRL(sim.parametros.metaMensal)}/mês</span>
                          </p>
                        </div>
                        <span className="text-xs text-[#484f58] shrink-0">
                          {new Date(sim.dataCriacao).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        {[
                          { label: 'Renda 3a', value: fmtBRL(sim.resultados.rendaEm3Anos) },
                          { label: 'Renda 5a', value: fmtBRL(sim.resultados.rendaEm5Anos) },
                          { label: 'Prazo', value: fmtPrazo(sim.resultados.prazoMeses) },
                        ].map(item => (
                          <div key={item.label} className="flex flex-col">
                            <span className="text-xs text-[#484f58]">{item.label}</span>
                            <span className="text-xs font-semibold text-[#e6edf3]">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Projects */}
              {recentProjects.length > 0 && (
                <>
                  <div className="flex items-center justify-between mt-2">
                    <h2 className="text-base font-semibold text-[#e6edf3]">Projetos recentes</h2>
                    <button onClick={() => setActiveView('projects')} className="flex items-center gap-1 text-sm text-[#3b82f6] hover:opacity-80 transition-opacity">
                      Ver todos <ArrowRight size={13} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {recentProjects.map(p => (
                      <div key={p.id} className="flex items-center gap-3 bg-[#161b22] border border-[#21262d] rounded-xl p-3 hover:border-[#30363d] transition-colors">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${p.color}22` }}>
                          <Brain size={15} style={{ color: p.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#e6edf3] truncate">{p.title}</p>
                          <p className="text-xs text-[#484f58]">{p.nodes.length} nós</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Ideas (1/3) */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#e6edf3]">Ideias recentes</h2>
                <button onClick={() => setActiveView('diary')} className="flex items-center gap-1 text-sm text-[#f59e0b] hover:opacity-80 transition-opacity">
                  Ver <ArrowRight size={13} />
                </button>
              </div>
              {recentIdeas.length === 0 ? (
                <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 text-center">
                  <Sparkles size={24} className="mx-auto mb-2 text-[#30363d]" />
                  <p className="text-xs text-[#8b949e]">Use o botão + para capturar ideias</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentIdeas.map(idea => (
                    <div key={idea.id} className="bg-[#161b22] border border-[#21262d] rounded-xl p-3 hover:border-[#30363d] transition-colors">
                      <p className="text-xs text-[#e6edf3] leading-relaxed line-clamp-2">{idea.text}</p>
                      <p className="text-xs text-[#484f58] mt-1.5">
                        {new Date(idea.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick actions */}
              <div className="flex flex-col gap-2 mt-2">
                <p className="text-xs font-medium text-[#484f58] uppercase tracking-wider">Ações rápidas</p>
                {[
                  { label: 'Abrir Simulador', view: 'simulador' as const, color: '#1d9e75', icon: Calculator },
                  { label: 'Novo projeto', view: 'projects' as const, color: '#3b82f6', icon: Brain },
                  { label: 'Separação financeira', view: 'separacao' as const, color: '#e8a020', icon: Zap },
                ].map(a => {
                  const Icon = a.icon
                  return (
                    <button
                      key={a.label}
                      onClick={() => setActiveView(a.view)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors"
                      style={{ background: '#161b22', border: '1px solid #21262d' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = a.color }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#21262d' }}
                    >
                      <Icon size={13} style={{ color: a.color }} />
                      <span className="text-[#e6edf3]">{a.label}</span>
                      <ArrowRight size={11} className="ml-auto text-[#484f58]" />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
