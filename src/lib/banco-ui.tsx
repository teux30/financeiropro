import { useEffect, useRef, useState } from 'react'
import {
  Wallet, Briefcase, TrendingUp, Laptop, Home, Store, Bike, PartyPopper,
  PlusCircle, Utensils, Car, HeartPulse, GraduationCap, Gamepad2, Repeat,
  CreditCard, Package, Users, Building, Zap, Megaphone, Landmark, Wrench,
  MinusCircle, ArrowLeftRight, Circle,
} from 'lucide-react'
import type { CategoriaFin } from '../store/bancoTypes'
import { CATEGORIAS } from '../store/bancoTypes'

const ICON_MAP: Record<string, React.ElementType> = {
  Wallet, Briefcase, TrendingUp, Laptop, Home, Store, Bike, PartyPopper,
  PlusCircle, Utensils, Car, HeartPulse, GraduationCap, Gamepad2, Repeat,
  CreditCard, Package, Users, Building, Zap, Megaphone, Landmark, Wrench,
  MinusCircle, ArrowLeftRight,
}

export function CategoriaIcon({ categoria, size = 16 }: { categoria: CategoriaFin; size?: number }) {
  const meta = CATEGORIAS[categoria]
  const Icon = ICON_MAP[meta?.icon] ?? Circle
  return (
    <div
      className="flex items-center justify-center rounded-lg shrink-0"
      style={{ width: size + 16, height: size + 16, background: `${meta?.cor ?? '#64748b'}22` }}
    >
      <Icon size={size} style={{ color: meta?.cor ?? '#64748b' }} />
    </div>
  )
}

/** Count-up animation hook */
export function useCountUp(target: number, duration = 600): number {
  const [val, setVal] = useState(0)
  const startRef = useRef(0)
  const fromRef = useRef(0)

  useEffect(() => {
    fromRef.current = val
    startRef.current = 0
    let raf = 0
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const p = Math.min((ts - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(fromRef.current + (target - fromRef.current) * eased)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return val
}
