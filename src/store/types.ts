import type { Node, Edge } from '@xyflow/react'

// ProjectColor is a wide string to allow simulator-generated branch colors
export type ProjectColor = string

export type ProjectIcon =
  | 'Lightbulb' | 'Rocket' | 'Target' | 'TrendingUp'
  | 'Brain' | 'Star' | 'Zap' | 'Heart' | 'Globe' | 'Code'

export type ProjectType =
  | 'idea' | 'structured' | 'planning' | 'study' | 'business'

export type ProjectStatus = 'active' | 'completed' | 'paused'

export type NodeType =
  | 'central' | 'topic' | 'subtopic' | 'note'
  | 'task' | 'idea' | 'link' | 'image'

export type KanbanColumn =
  | 'ideas' | 'todo' | 'doing' | 'done' | 'paused'

export type Priority = 'high' | 'medium' | 'low'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface KanbanCard {
  id: string
  title: string
  description?: string
  priority: Priority
  dueDate?: string
  tags: string[]
  checklist: ChecklistItem[]
  column: KanbanColumn
  nodeId?: string
}

export interface MindMapNodeData {
  label: string
  nodeType: NodeType
  color: ProjectColor
  icon?: ProjectIcon
  url?: string
  note?: string
  completed?: boolean
  isNew?: boolean
  gerado?: boolean          // flag for auto-generated nodes from simulator
  [key: string]: unknown
}

export interface Project {
  id: string
  title: string
  description: string
  color: ProjectColor
  icon: ProjectIcon
  type: ProjectType
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  nodes: Node<MindMapNodeData>[]
  edges: Edge[]
  kanbanCards: KanbanCard[]
  origem?: 'manual' | 'simulador'
  simulacaoId?: string
}

export interface QuickIdea {
  id: string
  text: string
  createdAt: string
  tags: string[]
  status: 'new' | 'processed' | 'discarded'
  projectId?: string
}
