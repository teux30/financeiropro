import { useState, useRef, type KeyboardEvent } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
  Plus, Trash2, Lightbulb, Link2, ImageIcon,
  CheckSquare, Square,
} from 'lucide-react'
import { ProjectIcon } from '../../components/ui/ProjectIcon'
import type { MindMapNodeData, NodeType, ProjectIcon as PIcon } from '../../store/types'

const NODE_SIZES: Record<NodeType, string> = {
  central: 'min-w-[120px] px-5 py-3 text-base font-bold',
  topic: 'min-w-[100px] px-4 py-2.5 text-sm font-semibold',
  subtopic: 'min-w-[80px] px-3 py-2 text-xs',
  note: 'min-w-[120px] px-3 py-2 text-xs',
  task: 'min-w-[100px] px-3 py-2 text-xs',
  idea: 'min-w-[90px] px-3 py-2 text-xs',
  link: 'min-w-[90px] px-3 py-2 text-xs',
  image: 'min-w-[100px] px-3 py-3 text-xs',
}

const NODE_STYLES: Record<NodeType, (color: string) => React.CSSProperties> = {
  central: (c) => ({
    background: `linear-gradient(135deg, ${c}cc, ${c}88)`,
    border: `2px solid ${c}`,
    color: 'white',
  }),
  topic: (c) => ({
    background: '#1a2233',
    border: `1.5px solid ${c}`,
    color: '#e6edf3',
  }),
  subtopic: (c) => ({
    background: '#161b22',
    border: `1px solid ${c}66`,
    color: '#8b949e',
  }),
  note: () => ({
    background: '#2a2215',
    border: '1px solid #eab30866',
    color: '#fde68a',
  }),
  task: (c) => ({
    background: '#162033',
    border: `1px solid ${c}55`,
    color: '#93c5fd',
  }),
  idea: () => ({
    background: '#162216',
    border: '1px solid #22c55e55',
    color: '#86efac',
  }),
  link: (c) => ({
    background: '#1a1a2e',
    border: `1px solid ${c}44`,
    color: '#c4b5fd',
  }),
  image: (c) => ({
    background: '#1a1a22',
    border: `1px solid ${c}44`,
    color: '#8b949e',
  }),
}

type CB1 = (id: string) => void
type CB2 = (id: string, val: string) => void

interface Props extends NodeProps {
  data: MindMapNodeData
}

export function MindNode({ id, data, selected }: Props) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(data.label)
  const inputRef = useRef<HTMLInputElement>(null)

  const style = NODE_STYLES[data.nodeType](data.color as string)
  const sizeClass = NODE_SIZES[data.nodeType]

  const onLabelChange = data.onLabelChange as CB2 | undefined
  const onAddChild   = data.onAddChild   as CB1 | undefined
  const onDelete     = data.onDelete     as CB1 | undefined
  const onToggleTask = data.onToggleTask as CB1 | undefined

  const handleDoubleClick = () => {
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const commitEdit = () => {
    setEditing(false)
    onLabelChange?.(id, label)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') { setEditing(false); setLabel(data.label) }
    e.stopPropagation()
  }

  const renderIcon = () => {
    if (data.nodeType === 'idea') return <Lightbulb size={12} className="shrink-0" />
    if (data.nodeType === 'link') return <Link2 size={12} className="shrink-0" />
    if (data.nodeType === 'image') return <ImageIcon size={14} className="shrink-0" />
    if (data.icon) return <ProjectIcon icon={data.icon as PIcon} size={12} className="shrink-0" />
    return null
  }

  const selectionGlow = selected ? { boxShadow: `0 0 0 2px ${data.color}, 0 0 16px ${String(data.color)}55` } : {}

  return (
    <div
      className={`relative rounded-xl ${sizeClass} flex items-center gap-1.5 cursor-default group ${data.isNew ? 'node-appear' : ''}`}
      style={{ ...style, ...selectionGlow, transition: 'box-shadow 150ms ease' }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Handles */}
      <Handle type="target" position={Position.Left} style={{ background: String(data.color), border: 'none', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: String(data.color), border: 'none', width: 8, height: 8 }} />
      <Handle type="target" position={Position.Top} style={{ background: String(data.color), border: 'none', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: String(data.color), border: 'none', width: 8, height: 8 }} />

      {/* Task checkbox */}
      {data.nodeType === 'task' && (
        <button onClick={() => onToggleTask?.(id)} className="shrink-0">
          {data.completed
            ? <CheckSquare size={13} className="text-[#1f6feb]" />
            : <Square size={13} className="text-[#484f58]" />}
        </button>
      )}

      {renderIcon()}

      {editing ? (
        <input
          ref={inputRef}
          value={label}
          onChange={e => setLabel(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="bg-transparent outline-none w-full min-w-[60px]"
          style={{ color: 'inherit', font: 'inherit' }}
        />
      ) : (
        <span className={`leading-tight ${data.nodeType === 'task' && data.completed ? 'line-through opacity-60' : ''}`}>
          {data.label || 'Sem título'}
        </span>
      )}

      {/* Hover actions */}
      {!editing && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1 bg-[#161b22] border border-[#30363d] rounded-md px-1.5 py-1 shadow-lg z-10">
          <button
            onClick={() => onAddChild?.(id)}
            className="p-0.5 rounded text-[#22c55e] hover:bg-[#22c55e22] transition-colors"
            title="Adicionar filho (Tab)"
          >
            <Plus size={12} />
          </button>
          <div className="w-px h-3 bg-[#30363d]" />
          <button
            onClick={() => onDelete?.(id)}
            className="p-0.5 rounded text-[#ef4444] hover:bg-[#ef444422] transition-colors"
            title="Excluir (Delete)"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  )
}
