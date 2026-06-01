import {
  Lightbulb, Rocket, Target, TrendingUp, Brain,
  Star, Zap, Heart, Globe, Code,
} from 'lucide-react'
import type { ProjectIcon as ProjectIconType } from '../../store/types'

const icons: Record<ProjectIconType, React.ElementType> = {
  Lightbulb, Rocket, Target, TrendingUp, Brain,
  Star, Zap, Heart, Globe, Code,
}

interface Props {
  icon: ProjectIconType
  size?: number
  className?: string
  style?: React.CSSProperties
}

export function ProjectIcon({ icon, size = 18, className = '', style }: Props) {
  const Icon = icons[icon]
  return <Icon size={size} className={className} style={style} />
}

export { icons as iconMap }
