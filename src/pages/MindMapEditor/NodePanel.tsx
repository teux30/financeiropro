import { useState } from 'react'
import { X, Copy, Trash2, Link2, FileText } from 'lucide-react'
import { ColorPicker } from '../../components/ui/ColorPicker'
import { ProjectIcon } from '../../components/ui/ProjectIcon'
import { Button } from '../../components/ui/Button'
import type { MindMapNodeData, NodeType, ProjectIcon as PIcon } from '../../store/types'

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  central: 'Central', topic: 'Tópico', subtopic: 'Subtópico',
  note: 'Nota', task: 'Tarefa', idea: 'Ideia',
  link: 'Link', image: 'Imagem',
}

const ICONS: PIcon[] = ['Lightbulb', 'Rocket', 'Target', 'TrendingUp', 'Brain', 'Star', 'Zap', 'Heart', 'Globe', 'Code']

interface Props {
  nodeId: string
  data: MindMapNodeData
  onClose: () => void
  onChangeType: (id: string, type: NodeType) => void
  onChangeColor: (id: string, color: string) => void
  onChangeIcon: (id: string, icon: PIcon | undefined) => void
  onChangeUrl: (id: string, url: string) => void
  onChangeNote: (id: string, note: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export function NodePanel({
  nodeId, data, onClose, onChangeType, onChangeColor,
  onChangeIcon, onChangeUrl, onChangeNote, onDuplicate, onDelete,
}: Props) {
  const [url, setUrl] = useState(data.url ?? '')
  const [note, setNote] = useState(data.note ?? '')

  return (
    <div className="glass rounded-xl w-64 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
        <span className="text-sm font-medium text-[#e6edf3]">Editar Nó</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-[#21262d] text-[#8b949e]">
          <X size={14} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
        {/* Type */}
        <div>
          <label className="text-xs font-medium text-[#8b949e] block mb-2">Tipo</label>
          <select
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-[#e6edf3] focus:outline-none focus:border-[#1f6feb]"
            value={data.nodeType}
            onChange={e => onChangeType(nodeId, e.target.value as NodeType)}
          >
            {(Object.entries(NODE_TYPE_LABELS) as [NodeType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Color */}
        <div>
          <label className="text-xs font-medium text-[#8b949e] block mb-2">Cor</label>
          <ColorPicker
            value={data.color as any}
            onChange={c => onChangeColor(nodeId, c)}
          />
        </div>

        {/* Icon */}
        <div>
          <label className="text-xs font-medium text-[#8b949e] block mb-2">Ícone</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onChangeIcon(nodeId, undefined)}
              className={`px-2 py-1 rounded text-xs ${!data.icon ? 'bg-[#1f6feb] text-white' : 'bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3]'}`}
            >
              Nenhum
            </button>
            {ICONS.map(icon => (
              <button
                key={icon}
                onClick={() => onChangeIcon(nodeId, icon)}
                className={`p-1.5 rounded transition-all ${
                  data.icon === icon ? 'text-white' : 'text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
                }`}
                style={data.icon === icon ? { backgroundColor: data.color } : {}}
              >
                <ProjectIcon icon={icon} size={14} />
              </button>
            ))}
          </div>
        </div>

        {/* URL */}
        <div>
          <label className="text-xs font-medium text-[#8b949e] flex items-center gap-1 mb-2">
            <Link2 size={11} /> URL
          </label>
          <input
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#1f6feb]"
            placeholder="https://..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            onBlur={() => onChangeUrl(nodeId, url)}
          />
        </div>

        {/* Note */}
        <div>
          <label className="text-xs font-medium text-[#8b949e] flex items-center gap-1 mb-2">
            <FileText size={11} /> Nota
          </label>
          <textarea
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#1f6feb] resize-none"
            placeholder="Anotação adicional..."
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            onBlur={() => onChangeNote(nodeId, note)}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => onDuplicate(nodeId)}>
            <Copy size={12} /> Duplicar
          </Button>
          <Button size="sm" variant="danger" className="flex-1" onClick={() => { onDelete(nodeId); onClose() }}>
            <Trash2 size={12} /> Excluir
          </Button>
        </div>
      </div>
    </div>
  )
}
