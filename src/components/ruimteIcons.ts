import { Paintbrush, PaintRoller, Bath, CookingPot, House, Layers, Toilet, type LucideIcon } from 'lucide-react'
import type { ProjectType } from '../lib/types'

export const RUIMTE_ICONS: Record<ProjectType, LucideIcon> = {
  stucwerk: PaintRoller,
  schilderwerk: Paintbrush,
  badkamer: Bath,
  toilet: Toilet,
  keuken: CookingPot,
  vloer: Layers,
  aanbouw: House,
}
