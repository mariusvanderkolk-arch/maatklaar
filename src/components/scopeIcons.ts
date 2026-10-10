import { Bath, CookingPot, Droplet, Layers, Ruler, SquareDashed, BrickWall, Droplets, Grid2x2, Hammer, Heater, LayoutGrid, PaintRoller, ShowerHead, Sparkles, Toilet, Wrench, Zap, Fan, Thermometer, DoorOpen, PanelTop, Square, type LucideIcon } from 'lucide-react'
import type { ScopeKey } from '../lib/types'

export const SCOPE_ICONS: Record<ScopeKey, LucideIcon> = {
  sloopwerk: Hammer,
  egaliseren: BrickWall,
  waterdicht: Droplets,
  vloerverwarming: Heater,
  wandtegels: LayoutGrid,
  vloertegels: Grid2x2,
  inloopdouche: ShowerHead,
  toilet: Toilet,
  wastafelmeubel: Bath,
  kitwerk: Sparkles,
  stucwerk: PaintRoller,
  fontein: Droplet,
  spatwand: CookingPot,
  legvloer: Layers,
  ondervloer: SquareDashed,
  plinten: Ruler,
  dekvloer: Square,
  leidingwerk: Wrench,
  elektra: Zap,
  radiator: Thermometer,
  ventilatie: Fan,
  bad: Bath,
  deur: DoorOpen,
  plafond: PanelTop,
}
