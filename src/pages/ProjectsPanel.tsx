import { useState, useMemo } from 'react'
import {
  Plus, Search, SlidersHorizontal, Trash2,
  Map, Columns, CheckCircle2, Circle, PauseCircle, TrendingUp,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { ProjectIcon } from '../components/ui/ProjectIcon'
import { Modal } from '../components/ui/Modal'
import { ProjectForm } from '../components/ui/ProjectForm'
import { Button } from '../components/ui/Button'
import type { Project, ProjectType, ProjectStatus } from '../store/types'

const TYPE_LABELS: Record<ProjectType, string> = {
  idea: 'Ideia Livre', structured: 'Proj. Estruturado',
  planning: 'Planejamento', study: 'Estudo', business: 'Negócio',
}

const STATUS_ICONS: Record<ProjectStatus, React.ElementType> = {
  active: Circle, completed: CheckCircle2, paused: PauseCircle,
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: '#22c55e', completed: '#1f6feb', paused: '#f97316',
}

function getCompletion(p: Project) {
  const tasks = p.nodes.filter(n => n.data.nodeType === 'task')
  if (!tasks.length) return 0
  const done = tasks.filter(n => n.data.completed).length
  return Math.round((done / tasks.length) * 100)
}

type SortKey = 'date' | 'alpha' | 'completion'
type FilterOrigem = 'all' | 'manual' | 'simulador'

export function ProjectsPanel() {
  const { projects, createProject, deleteProject, setActiveView, setActiveProject } = useStore()
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<ProjectType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all')
  const [filterOrigem, setFilterOrigem] = useState<FilterOrigem>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')

  const filtered = useMemo(() => {
    let list = [...projects]
    if (search)         list = list.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    if (filterType   !== 'all') list = list.filter(p => p.type === filterType)
    if (filterStatus !== 'all') list = list.filter(p => p.status === filterStatus)
    if (filterOrigem === 'simulador') list = list.filter(p => p.origem === 'simulador')
    if (filterOrigem === 'manual')    list = list.filter(p => p.origem !== 'simulador')
    list.sort((a, b) => {
      if (sortKey === 'alpha')      return a.title.localeCompare(b.title)
      if (sortKey === 'completion') return getCompletion(b) - getCompletion(a)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    return list
  }, [projects, search, filterType, filterStatus, filterOrigem, sortKey])

  const simCount = projects.filter(p => p.origem === 'simulador').length

  const openEditor = (id: string) => { setActiveProject(id); setActiveView('editor') }
  const openKanban = (id: string) => { setActiveProject(id); setActiveView('kanban') }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#e6edf3]">Mapa Mental</h1>
            <p className="text-sm text-[#8b949e] mt-0.5">
              {projects.length} projetos · {simCount > 0 && <span style={{ color: '#1d9e75' }}>{simCount} do simulador</span>}
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowNew(true)}>
            <Plus size={16} /> Novo Projeto
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]" />
            <input
              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#1f6feb] transition-colors"
              placeholder="Buscar projetos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <SlidersHorizontal size={14} className="text-[#484f58]" />
            <select className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-2 text-sm text-[#8b949e] focus:outline-none focus:border-[#1f6feb]"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value as ProjectStatus | 'all')}>
              <option value="all">Todos status</option>
              <option value="active">Em andamento</option>
              <option value="completed">Concluído</option>
              <option value="paused">Pausado</option>
            </select>
            <select className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-2 text-sm text-[#8b949e] focus:outline-none focus:border-[#1f6feb]"
              value={filterOrigem} onChange={e => setFilterOrigem(e.target.value as FilterOrigem)}>
              <option value="all">Todas origens</option>
              <option value="manual">Criados manualmente</option>
              <option value="simulador">Simulações Financeiras</option>
            </select>
            <select className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-2 text-sm text-[#8b949e] focus:outline-none focus:border-[#1f6feb]"
              value={filterType} onChange={e => setFilterType(e.target.value as ProjectType | 'all')}>
              <option value="all">Todos tipos</option>
              <option value="idea">Ideia Livre</option>
              <option value="structured">Proj. Estruturado</option>
              <option value="planning">Planejamento</option>
              <option value="study">Estudo</option>
              <option value="business">Negócio</option>
            </select>
            <select className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-2 text-sm text-[#8b949e] focus:outline-none focus:border-[#1f6feb]"
              value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}>
              <option value="date">Por data</option>
              <option value="alpha">Alfabético</option>
              <option value="completion">% conclusão</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#161b22] flex items-center justify-center mb-4">
              <Plus size={28} className="text-[#30363d]" />
            </div>
            <p className="text-[#8b949e]">
              {projects.length === 0 ? 'Nenhum projeto ainda. Crie o primeiro!' : 'Nenhum projeto corresponde aos filtros.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => (
              <ProjectCard key={p.id} project={p} completion={getCompletion(p)}
                onOpenEditor={() => openEditor(p.id)}
                onOpenKanban={() => openKanban(p.id)}
                onDelete={() => deleteProject(p.id)} />
            ))}
          </div>
        )}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Novo Projeto">
        <ProjectForm
          onSubmit={data => { createProject(data); setShowNew(false) }}
          onCancel={() => setShowNew(false)}
        />
      </Modal>
    </div>
  )
}

function ProjectCard({
  project: p, completion, onOpenEditor, onOpenKanban, onDelete
}: {
  project: Project; completion: number
  onOpenEditor: () => void; onOpenKanban: () => void; onDelete: () => void
}) {
  const StatusIcon = STATUS_ICONS[p.status]
  const isSimulation = p.origem === 'simulador'

  return (
    <div
      className="group relative flex flex-col bg-[#161b22] border border-[#21262d] rounded-xl p-4 hover:border-[#30363d] transition-all duration-200 cursor-pointer hover:shadow-lg"
      onClick={onOpenEditor}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${p.color}22`, border: `1px solid ${p.color}44` }}>
          <ProjectIcon icon={p.icon} size={20} style={{ color: p.color } as React.CSSProperties} />
        </div>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          {!isSimulation && (
            <button onClick={onOpenKanban}
              className="p-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] transition-colors" title="Kanban">
              <Columns size={13} />
            </button>
          )}
          <button onClick={onOpenEditor}
            className="p-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] transition-colors" title="Mapa Mental">
            <Map size={13} />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-md bg-[#21262d] hover:bg-[#da3633] text-[#8b949e] hover:text-white transition-colors" title="Excluir">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Badge simulação */}
      {isSimulation && (
        <div className="flex items-center gap-1 mb-2">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ color: '#1d9e75', background: '#1d9e7520', border: '1px solid #1d9e7540' }}>
            <TrendingUp size={10} /> Simulação Financeira
          </span>
        </div>
      )}

      <h3 className="font-semibold text-[#e6edf3] text-sm mb-1 line-clamp-1">{p.title}</h3>
      <p className="text-xs text-[#8b949e] mb-3 line-clamp-2 flex-1">{p.description || 'Sem descrição'}</p>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-[#8b949e] mb-1">
          <span>{TYPE_LABELS[p.type]}</span>
          <span>{completion}%</span>
        </div>
        <div className="h-1 bg-[#21262d] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${completion}%`, backgroundColor: p.color }} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-[#484f58]">
        <div className="flex items-center gap-1">
          <StatusIcon size={12} style={{ color: STATUS_COLORS[p.status] }} />
          <span style={{ color: STATUS_COLORS[p.status] }}>
            {p.status === 'active' ? 'Em andamento' : p.status === 'completed' ? 'Concluído' : 'Pausado'}
          </span>
        </div>
        <span>{p.nodes.length} nós</span>
      </div>
    </div>
  )
}
