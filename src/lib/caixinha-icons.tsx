import {
  PiggyBank, Plane, Home, Car, Heart, GraduationCap, Shield, Gift,
  Briefcase, Smartphone, Wrench, Landmark, Sparkles, Target, Baby,
  PartyPopper, Circle,
} from 'lucide-react'

const MAP: Record<string, React.ElementType> = {
  PiggyBank, Plane, Home, Car, Heart, GraduationCap, Shield, Gift,
  Briefcase, Smartphone, Wrench, Landmark, Sparkles, Target, Baby, PartyPopper,
}

export function CaixinhaIcon({ icone, size = 18, color }: { icone: string; size?: number; color?: string }) {
  const Icon = MAP[icone] ?? Circle
  return <Icon size={size} style={color ? { color } : undefined} />
}
