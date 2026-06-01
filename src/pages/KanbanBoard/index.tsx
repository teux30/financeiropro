import { useState } from 'react'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { ArrowLeft, Map, Plus, Edit2, Trash2, Calendar } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { CardModal } from './CardModal'
import { Button } from '../../components/ui/Button'
import type { KanbanCard, KanbanColumn, Priority } from '../../store/types'

const COLUMNS: { id: KanbanColumn; label: string; emoji: string; color: string }[] = [
  { id: 'ideas', label: 'Ideias', emoji: '💡', color: '#eab308' },
  { id: 'todo', label: 'A Fazer', emoji: '📋', color: '#8b949e' },
  { id: 'doing', label: 'Em Andamento', emoji: '🔄', color: '#1f6feb' },
  { id: 'done', label: 'Concluído', emoji: '✅', color: '#22c55e' },
  { id: 'paused', label: 'Pausado', emoji: '⏸️', color: '#f97316' },
]

const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#ef4444', medium: '#f97316', low: '#22c55e',
}

function KanbanCardEl({ card, onEdit, onDelete }: { card: KanbanCard; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id })
  const done = card.checklist.filter(c => c.done).length
  const total = card.checklist.length

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-[#1c2128] border border-[#30363d] rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:border-[#484f58] group ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-[#e6edf3] leading-snug">{card.title}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="p-0.5 text-[#8b949e] hover:text-[#e6edf3]"><Edit2 size={11} /></button>
          <button onClick={onDelete} className="p-0.5 text-[#8b949e] hover:text-[#ef4444]"><Trash2 size={11} /></button>
        </div>
      </div>

      {card.description && (
        <p className="text-xs text-[#8b949e] mb-2 line-clamp-2">{card.description}</p>
      )}

      <div className="flex flex-wrap gap-1 mb-2">
        <span
          className="px-1.5 py-0.5 rounded text-xs font-medium"
          style={{ color: PRIORITY_COLORS[card.priority], backgroundColor: `${PRIORITY_COLORS[card.priority]}22` }}
        >
          {card.priority === 'high' ? 'Alta' : card.priority === 'medium' ? 'Média' : 'Baixa'}
        </span>
        {card.tags.map(tag => (
          <span key={tag} className="px-1.5 py-0.5 bg-[#1f6feb22] text-[#388bfd] text-xs rounded">
            {tag}
          </span>
        ))}
      </div>

      {total > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-[#8b949e] mb-1">
            <span>{done}/{total} tarefas</span>
          </div>
          <div className="h-1 bg-[#21262d] rounded-full overflow-hidden">
            <div className="h-full bg-[#1f6feb] rounded-full" style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </div>
      )}

      {card.dueDate && (
        <div className="flex items-center gap-1 text-xs text-[#8b949e]">
          <Calendar size={10} />
          <span>{new Date(card.dueDate).toLocaleDateString('pt-BR')}</span>
        </div>
      )}
    </div>
  )
}

function DroppableColumn({
  col, cards, onAddCard, onEditCard, onDeleteCard,
}: {
  col: typeof COLUMNS[number]
  cards: KanbanCard[]
  onAddCard: (col: KanbanColumn) => void
  onEditCard: (card: KanbanCard) => void
  onDeleteCard: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })

  return (
    <div className="flex flex-col min-w-[240px] max-w-[280px] w-full">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span>{col.emoji}</span>
          <span className="text-sm font-semibold text-[#e6edf3]">{col.label}</span>
          <span className="text-xs px-1.5 py-0.5 bg-[#21262d] rounded-full text-[#8b949e]">{cards.length}</span>
        </div>
        <button
          onClick={() => onAddCard(col.id)}
          className="p-1 rounded-md text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 p-2 rounded-xl min-h-[200px] transition-colors ${
          isOver ? 'bg-[#1f6feb11] border border-[#1f6feb44]' : 'bg-[#161b22] border border-[#21262d]'
        }`}
      >
        {cards.map(card => (
          <KanbanCardEl
            key={card.id}
            card={card}
            onEdit={() => onEditCard(card)}
            onDelete={() => onDeleteCard(card.id)}
          />
        ))}
        {cards.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-xs text-[#484f58] italic">
            Solte aqui
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard() {
  const { activeProjectId, projects, addKanbanCard, updateKanbanCard, moveKanbanCard, deleteKanbanCard, setActiveView } = useStore()
  const project = projects.find(p => p.id === activeProjectId)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCard, setEditCard] = useState<KanbanCard | null>(null)
  const [defaultCol, setDefaultCol] = useState<KanbanColumn>('todo')
  const [dragId, setDragId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  if (!project) return null

  const cards = project.kanbanCards

  const handleDragEnd = (event: DragEndEvent) => {
    setDragId(null)
    const { active, over } = event
    if (!over) return
    const col = over.id as KanbanColumn
    if (COLUMNS.find(c => c.id === col)) {
      moveKanbanCard(project.id, active.id as string, col)
    }
  }

  const dragCard = cards.find(c => c.id === dragId)

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Toolbar */}
      <div className="glass border-b border-[#30363d] flex items-center gap-3 px-4 py-2.5 shrink-0">
        <button
          onClick={() => setActiveView('projects')}
          className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="w-px h-5 bg-[#30363d]" />
        <span className="text-sm font-semibold" style={{ color: project.color }}>{project.title}</span>
        <span className="text-sm text-[#8b949e]">— Kanban</span>
        <div className="flex-1" />
        <Button size="sm" onClick={() => { setEditCard(null); setDefaultCol('todo'); setModalOpen(true) }}>
          <Plus size={14} /> Novo Card
        </Button>
        <button
          onClick={() => setActiveView('editor')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-sm text-[#e6edf3] transition-colors"
        >
          <Map size={15} /> Mapa Mental
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DndContext
          sensors={sensors}
          onDragStart={e => setDragId(e.active.id as string)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map(col => (
              <DroppableColumn
                key={col.id}
                col={col}
                cards={cards.filter(c => c.column === col.id)}
                onAddCard={(c) => { setEditCard(null); setDefaultCol(c); setModalOpen(true) }}
                onEditCard={(card) => { setEditCard(card); setModalOpen(true) }}
                onDeleteCard={(id) => deleteKanbanCard(project.id, id)}
              />
            ))}
          </div>

          <DragOverlay>
            {dragCard && (
              <div className="bg-[#1c2128] border border-[#388bfd] rounded-xl p-3 shadow-2xl rotate-2 opacity-90">
                <span className="text-sm font-medium text-[#e6edf3]">{dragCard.title}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <CardModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditCard(null) }}
        initial={editCard ?? undefined}
        defaultColumn={defaultCol}
        onSave={data => {
          if (editCard) updateKanbanCard(project.id, editCard.id, data)
          else addKanbanCard(project.id, data)
        }}
      />
    </div>
  )
}
