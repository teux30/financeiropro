import {
  useCallback, useEffect, useRef, useState, useMemo,
} from 'react'
import {
  ReactFlow, Background, MiniMap, Controls, BackgroundVariant,
  addEdge, applyNodeChanges, applyEdgeChanges,
  useReactFlow, ReactFlowProvider,
  type Node, type Edge, type Connection, type NodeChange, type EdgeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  ArrowLeft, Columns, Save, Download, Maximize2,
  Undo2, Redo2, Plus, ChevronDown,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { MindNode } from './MindNode'
import { NodePanel } from './NodePanel'
import type { MindMapNodeData, NodeType, ProjectColor } from '../../store/types'

const NODE_TYPES = { mind: MindNode }

const nanoid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

const DEFAULT_EDGE_STYLE = (color: string, depth: number) => ({
  stroke: color,
  strokeWidth: depth === 0 ? 3 : depth === 1 ? 2 : 1,
  strokeDasharray: undefined,
})

function MindMapFlow() {
  const { activeProjectId, projects, updateProjectNodes, setActiveView, setActiveProject } = useStore()
  const project = projects.find(p => p.id === activeProjectId)
  const rf = useReactFlow()

  const [nodes, setNodes] = useState<Node<MindMapNodeData>[]>(project?.nodes ?? [])
  const [edges, setEdges] = useState<Edge[]>(project?.edges ?? [])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [history, setHistory] = useState<Array<{ nodes: Node<MindMapNodeData>[]; edges: Edge[] }>>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [addTypeOpen, setAddTypeOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const historyRef = useRef({ nodes, edges })
  historyRef.current = { nodes, edges }

  // Push to history
  const pushHistory = useCallback((n: Node<MindMapNodeData>[], e: Edge[]) => {
    setHistory(prev => {
      const sliced = prev.slice(0, historyIdx + 1)
      return [...sliced, { nodes: n, edges: e }].slice(-50)
    })
    setHistoryIdx(prev => Math.min(prev + 1, 49))
  }, [historyIdx])

  // Auto-initialize central node
  useEffect(() => {
    if (project && nodes.length === 0 && project.nodes.length === 0) {
      const central: Node<MindMapNodeData> = {
        id: nanoid(),
        type: 'mind',
        position: { x: 0, y: 0 },
        data: {
          label: project.title,
          nodeType: 'central',
          color: project.color as ProjectColor,
        },
      }
      setNodes([central])
    }
  }, [project]) // eslint-disable-line

  // Auto-save debounced
  useEffect(() => {
    if (!activeProjectId) return
    if (saveTimer.current !== null) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateProjectNodes(activeProjectId, nodes, edges)
    }, 1000)
    return () => { if (saveTimer.current !== null) clearTimeout(saveTimer.current) }
  }, [nodes, edges, activeProjectId, updateProjectNodes])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes(prev => applyNodeChanges(changes, prev) as Node<MindMapNodeData>[])
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges(prev => applyEdgeChanges(changes, prev))
  }, [])

  const onConnect = useCallback((conn: Connection) => {
    const sourceNode = nodes.find(n => n.id === conn.source)
    const color = sourceNode?.data.color ?? project?.color ?? '#6366f1'
    setEdges(prev => addEdge({
      ...conn,
      type: 'smoothstep',
      style: DEFAULT_EDGE_STYLE(color as string, 1),
      animated: false,
    }, prev))
  }, [nodes, project])

  const addNode = useCallback((type: NodeType) => {
    const color = (project?.color ?? '#6366f1') as ProjectColor
    const newNode: Node<MindMapNodeData> = {
      id: nanoid(),
      type: 'mind',
      position: { x: Math.random() * 300 - 150, y: Math.random() * 200 - 100 },
      data: {
        label: type === 'task' ? 'Nova tarefa' : type === 'note' ? 'Anotação' : 'Novo nó',
        nodeType: type,
        color,
        isNew: true,
        onLabelChange: handleLabelChange,
        onAddChild: addChildNode,
        onDelete: deleteNode,
        onToggleTask: toggleTask,
      },
    }
    setNodes(prev => [...prev, newNode])
    pushHistory([...nodes, newNode], edges)
    setAddTypeOpen(false)
  }, [project, nodes, edges, pushHistory]) // eslint-disable-line

  const addChildNode = useCallback((parentId: string) => {
    const parent = nodes.find(n => n.id === parentId)
    if (!parent) return
    const color = parent.data.color as ProjectColor
    const depth = parent.data.nodeType === 'central' ? 1 : parent.data.nodeType === 'topic' ? 2 : 2
    const childType: NodeType = depth === 1 ? 'topic' : 'subtopic'
    const childId = nanoid()
    const newNode: Node<MindMapNodeData> = {
      id: childId,
      type: 'mind',
      position: { x: parent.position.x + 220, y: parent.position.y + Math.random() * 80 - 40 },
      data: {
        label: 'Novo tópico',
        nodeType: childType,
        color,
        isNew: true,
        onLabelChange: handleLabelChange,
        onAddChild: addChildNode,
        onDelete: deleteNode,
        onToggleTask: toggleTask,
      },
    }
    const newEdge: Edge = {
      id: `e-${parentId}-${childId}`,
      source: parentId,
      target: childId,
      type: 'smoothstep',
      style: DEFAULT_EDGE_STYLE(color as string, depth),
    }
    setNodes(prev => [...prev, newNode])
    setEdges(prev => [...prev, newEdge])
  }, [nodes]) // eslint-disable-line

  const handleLabelChange = useCallback((id: string, label: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, label } } : n))
  }, [])

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id))
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id))
    setSelectedNode(null)
    setShowPanel(false)
  }, [])

  const toggleTask = useCallback((id: string) => {
    setNodes(prev => prev.map(n =>
      n.id === id ? { ...n, data: { ...n.data, completed: !n.data.completed } } : n
    ))
  }, [])

  // Inject callbacks into node data
  const nodesWithCb = useMemo(() => nodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      onLabelChange: handleLabelChange,
      onAddChild: addChildNode,
      onDelete: deleteNode,
      onToggleTask: toggleTask,
    },
  })), [nodes, handleLabelChange, addChildNode, deleteNode, toggleTask])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'Tab' && selectedNode) {
        e.preventDefault()
        addChildNode(selectedNode)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        e.preventDefault()
        deleteNode(selectedNode)
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        if (activeProjectId) updateProjectNodes(activeProjectId, nodes, edges)
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        if (historyIdx > 0) {
          const prev = history[historyIdx - 1]
          setNodes(prev.nodes)
          setEdges(prev.edges)
          setHistoryIdx(i => i - 1)
        }
      }
      if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        if (historyIdx < history.length - 1) {
          const next = history[historyIdx + 1]
          setNodes(next.nodes)
          setEdges(next.edges)
          setHistoryIdx(i => i + 1)
        }
      }
      if (e.key === 'Escape') { setSelectedNode(null); setShowPanel(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedNode, nodes, edges, history, historyIdx]) // eslint-disable-line

  const autoLayout = useCallback(() => {
    // Simple radial layout
    const central = nodes.find(n => n.data.nodeType === 'central')
    if (!central) return
    const topics = nodes.filter(n => edges.some(e => e.source === central.id && e.target === n.id))
    const angleStep = (2 * Math.PI) / (topics.length || 1)
    const radius = 260

    const updatedNodes = nodes.map(n => {
      if (n.id === central.id) return { ...n, position: { x: 0, y: 0 } }
      const idx = topics.findIndex(t => t.id === n.id)
      if (idx !== -1) {
        return {
          ...n,
          position: {
            x: Math.cos(idx * angleStep - Math.PI / 2) * radius,
            y: Math.sin(idx * angleStep - Math.PI / 2) * radius,
          },
        }
      }
      return n
    })
    setNodes(updatedNodes as Node<MindMapNodeData>[])
    setTimeout(() => rf.fitView({ padding: 0.2 }), 50)
  }, [nodes, edges, rf])

  const exportPng = useCallback(async () => {
    const el = document.querySelector('.react-flow__viewport') as HTMLElement
    if (!el) return
    try {
      // Use Canvas API via html serialization
      const { toBlob } = await import('html-to-image').catch(() => ({ toBlob: null }))
      if (!toBlob) { alert('Export not available. Install html-to-image to enable.'); return }
      const blob = await toBlob(el)
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${project?.title ?? 'mapa'}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Exportação não disponível.')
    }
  }, [project])

  if (!project) return null

  const selNode = nodes.find(n => n.id === selectedNode)

  const NODE_TYPE_OPTIONS: { type: NodeType; label: string }[] = [
    { type: 'topic', label: '🔵 Tópico' },
    { type: 'subtopic', label: '⚪ Subtópico' },
    { type: 'note', label: '🟡 Nota' },
    { type: 'task', label: '✅ Tarefa' },
    { type: 'idea', label: '💡 Ideia' },
    { type: 'link', label: '🔗 Link' },
    { type: 'image', label: '🖼️ Imagem' },
  ]

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Toolbar */}
      <div className="glass border-b border-[#30363d] flex items-center gap-2 px-4 py-2.5 shrink-0 z-10">
        <button
          onClick={() => { setActiveProject(null); setActiveView('projects') }}
          className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
          title="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="w-px h-5 bg-[#30363d]" />

        <span
          className="text-sm font-semibold text-[#e6edf3] cursor-pointer hover:text-[#388bfd]"
          style={{ color: project.color }}
        >
          {project.title}
        </span>

        <div className="flex-1" />

        {/* Undo/Redo */}
        <button
          onClick={() => {
            if (historyIdx > 0) {
              const prev = history[historyIdx - 1]
              setNodes(prev.nodes); setEdges(prev.edges)
              setHistoryIdx(i => i - 1)
            }
          }}
          disabled={historyIdx <= 0}
          className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] disabled:opacity-30 transition-colors"
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={() => {
            if (historyIdx < history.length - 1) {
              const next = history[historyIdx + 1]
              setNodes(next.nodes); setEdges(next.edges)
              setHistoryIdx(i => i + 1)
            }
          }}
          disabled={historyIdx >= history.length - 1}
          className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] disabled:opacity-30 transition-colors"
          title="Refazer (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>

        <div className="w-px h-5 bg-[#30363d]" />

        {/* Add node */}
        <div className="relative">
          <button
            onClick={() => setAddTypeOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-sm text-[#e6edf3] transition-colors"
          >
            <Plus size={15} />
            Adicionar
            <ChevronDown size={13} />
          </button>
          {addTypeOpen && (
            <div className="absolute top-full mt-1 left-0 glass rounded-xl shadow-xl w-44 z-50 overflow-hidden">
              {NODE_TYPE_OPTIONS.map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => addNode(type)}
                  className="w-full text-left px-3 py-2 text-sm text-[#e6edf3] hover:bg-[#21262d] transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={autoLayout}
          className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-sm text-[#e6edf3] transition-colors"
          title="Layout automático"
        >
          Layout
        </button>

        <button
          onClick={() => rf.fitView({ padding: 0.2 })}
          className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
          title="Fit view"
        >
          <Maximize2 size={16} />
        </button>

        <button
          onClick={exportPng}
          className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
          title="Exportar PNG"
        >
          <Download size={16} />
        </button>

        <button
          onClick={() => { if (activeProjectId) updateProjectNodes(activeProjectId, nodes, edges) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f6feb] hover:bg-[#388bfd] text-sm text-white transition-colors"
          title="Salvar (Ctrl+S)"
        >
          <Save size={15} />
          Salvar
        </button>

        <div className="w-px h-5 bg-[#30363d]" />

        <button
          onClick={() => { setActiveView('kanban') }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-sm text-[#e6edf3] transition-colors"
        >
          <Columns size={15} />
          Kanban
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodesWithCb}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => {
            setSelectedNode(node.id)
            setShowPanel(true)
          }}
          onPaneClick={() => { setSelectedNode(null); setShowPanel(false); setAddTypeOpen(false) }}
          onEdgeClick={(_, edge) => setEdges(prev => prev.filter(e => e.id !== edge.id))}
          fitView
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: 'smoothstep' }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="rgba(255,255,255,0.06)"
          />
          <MiniMap
            nodeColor={n => (n.data as MindMapNodeData).color as string}
            maskColor="rgba(13,17,23,0.8)"
          />
          <Controls showInteractive={false} />
        </ReactFlow>

        {/* Node panel */}
        {showPanel && selectedNode && selNode && (
          <div className="absolute right-4 top-4 z-20">
            <NodePanel
              nodeId={selectedNode}
              data={selNode.data}
              onClose={() => setShowPanel(false)}
              onChangeType={(id, type) => setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, nodeType: type } } : n))}
              onChangeColor={(id, color) => setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, color: color as ProjectColor } } : n))}
              onChangeIcon={(id, icon) => setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, icon } } : n))}
              onChangeUrl={(id, url) => setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, url } } : n))}
              onChangeNote={(id, note) => setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, note } } : n))}
              onDuplicate={(id) => {
                const node = nodes.find(n => n.id === id)
                if (!node) return
                const dup: Node<MindMapNodeData> = {
                  ...node,
                  id: nanoid(),
                  position: { x: node.position.x + 40, y: node.position.y + 40 },
                  data: { ...node.data },
                }
                setNodes(prev => [...prev, dup])
              }}
              onDelete={deleteNode}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export function MindMapEditor() {
  return (
    <ReactFlowProvider>
      <MindMapFlow />
    </ReactFlowProvider>
  )
}
