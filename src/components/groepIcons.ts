import { BrickWall, Layers, Droplets, Hammer, Heater, LayoutGrid, Package, Sparkles, Bath, Wrench, Zap, DoorOpen, CookingPot, type LucideIcon } from 'lucide-react'
import type { Groep } from '../lib/calc'

export const GROEP_ICONS: Record<Groep, LucideIcon> = {
  sloop: Hammer,
  voorbereiding: BrickWall,
  waterdicht: Droplets,
  vloerverwarming: Heater,
  tegels: LayoutGrid,
  vloer: Layers,
  'lijm-voeg': Package,
  afwerking: Sparkles,
  sanitair: Bath,
  leidingwerk: Wrench,
  elektra: Zap,
  timmerwerk: DoorOpen,
  keuken: CookingPot,
}
