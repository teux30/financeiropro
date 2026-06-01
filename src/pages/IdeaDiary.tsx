import { useState, useMemo } from 'react'
import {
  Search, Tag, Trash2, ArrowRight, Clock,
  CheckCircle2, XCircle, Sparkles,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Modal } from '../components/ui/Modal'
import { ProjectForm } from '../components/ui/ProjectForm'
import type { QuickIdea } from '../store/types'

const STATUS_CONFIG = {
  new: { label: 'Nova', color: '#1f6feb', icon: Sparkles },
  processed: { label: 'Processada', color: '#22c55e', icon: CheckCircle2 },
  discarded: { label: 'Descartada', color: '#8b949e', icon: XCircle },
}

export function IdeaDiary() {
  const { quickIdeas, updateQuickIdea, deleteQuickIdea, convertIdeaToProject, setActiveView } = useStore()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<QuickIdea['status'] | 'all'>('all')
  const [filterTag, setFilterTag] = useState('')
  const [convertIdea, setConvertIdea] = useState<QuickIdea | null>(null)

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    quickIdeas.forEach(i => i.tags.forEach(t => tags.add(t)))
    return [...tags]
  }, [quickIdeas])

  const filtered = useMemo(() => {
    let list = [...quickIdeas]
    if (search) list = list.filter(i => i.text.toLowerCase().includes(search.toLowerCase()))
    if (filterStatus !== 'all') list = list.filter(i => i.status === filterStatus)
    if (filterTag) list = list.filter(i => i.tags.includes(filterTag))
    return list
  }, [quickIdeas, search, filterStatus, filterTag])

  const grouped = useMemo(() => {
    const groups: Record<string, QuickIdea[]> = {}
    filtered.forEach(idea => {
      const date = new Date(idea.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      if (!groups[date]) groups[date] = []
      groups[date].push(idea)
    })
    return groups
  }, [filtered])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-6 pb-0">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-[#e6edf3]">Diário de Ideias</h1>
          <p className="text-sm text-[#8b949e] mt-0.5">{quickIdeas.length} ideias capturadas</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]" />
            <input
              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#1f6feb] transition-colors"
              placeholder="Buscar ideias..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-2 text-sm text-[#8b949e] focus:outline-none focus:border-[#1f6feb]"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
          >
            <option value="all">Todos status</option>
            <option value="new">Novas</option>
            <option value="processed">Processadas</option>
            <option value="discarded">Descartadas</option>
          </select>

          {allTags.length > 0 && (
            <select
              className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-2 text-sm text-[#8b949e] focus:outline-none focus:border-[#1f6feb]"
              value={filterTag}
              onChange={e => setFilterTag(e.target.value)}
            >
              <option value="">Todas tags</option>
              {allTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Sparkles size={32} className="text-[#30363d] mb-3" />
            <p className="text-[#8b949e]">Nenhuma ideia encontrada. Use o botão + para capturar!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-2xl">
            {Object.entries(grouped).map(([date, ideas]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">{date}</span>
                  <div className="flex-1 h-px bg-[#21262d]" />
                </div>
                <div className="flex flex-col gap-2">
                  {ideas.map(idea => (
                    <IdeaCard
                      key={idea.id}
                      idea={idea}
                      onStatusChange={(status) => updateQuickIdea(idea.id, { status })}
                      onDelete={() => deleteQuickIdea(idea.id)}
                      onConvert={() => setConvertIdea(idea)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Convert to Project Modal */}
      <Modal
        open={!!convertIdea}
        onClose={() => setConvertIdea(null)}
        title="Converter em Projeto"
      >
        {convertIdea && (
          <div>
            <div className="mb-4 p-3 bg-[#161b22] rounded-lg border border-[#30363d]">
              <p className="text-sm text-[#8b949e] mb-1">Ideia original:</p>
              <p className="text-sm text-[#e6edf3]">{convertIdea.text}</p>
            </div>
            <ProjectForm
              initial={{ title: convertIdea.text.slice(0, 50) }}
              submitLabel="Converter em Projeto"
              onSubmit={data => {
                convertIdeaToProject(convertIdea.id, data)
                setConvertIdea(null)
                setActiveView('projects')
              }}
              onCancel={() => setConvertIdea(null)}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

function IdeaCard({
  idea, onStatusChange, onDelete, onConvert,
}: {
  idea: QuickIdea
  onStatusChange: (status: QuickIdea['status']) => void
  onDelete: () => void
  onConvert: () => void
}) {
  const cfg = STATUS_CONFIG[idea.status]
  const StatusIcon = cfg.icon

  return (
    <div className="group flex items-start gap-3 p-4 bg-[#161b22] border border-[#21262d] rounded-xl hover:border-[#30363d] transition-all">
      <button
        onClick={() => {
          const next: QuickIdea['status'][] = ['new', 'processed', 'discarded']
          const idx = next.indexOf(idea.status)
          onStatusChange(next[(idx + 1) % next.length])
        }}
        className="shrink-0 mt-0.5"
        title={`Status: ${cfg.label}`}
      >
        <StatusIcon size={16} style={{ color: cfg.color }} />
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm text-[#e6edf3] leading-relaxed ${idea.status === 'discarded' ? 'line-through opacity-50' : ''}`}>
          {idea.text}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-1 text-xs text-[#484f58]">
            <Clock size={10} />
            <span>{new Date(idea.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {idea.tags.map(tag => (
            <span key={tag} className="flex items-center gap-0.5 text-xs text-[#388bfd]">
              <Tag size={9} />{tag}
            </span>
          ))}
          {idea.projectId && (
            <span className="text-xs text-[#22c55e]">✓ Convertida</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!idea.projectId && (
          <button
            onClick={onConvert}
            className="p-1.5 rounded-md text-[#8b949e] hover:text-[#22c55e] hover:bg-[#22c55e22] transition-colors"
            title="Converter em projeto"
          >
            <ArrowRight size={14} />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md text-[#8b949e] hover:text-[#ef4444] hover:bg-[#ef444422] transition-colors"
          title="Excluir"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
