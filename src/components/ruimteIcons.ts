import { Bath, CookingPot, House, Layers, Toilet, type LucideIcon } from 'lucide-react'
import type { ProjectType } from '../lib/types'

export const RUIMTE_ICONS: Record<ProjectType, LucideIcon> = {
  badkamer: Bath,
  toilet: Toilet,
  keuken: CookingPot,
  vloer: Layers,
  aanbouw: House,
}
