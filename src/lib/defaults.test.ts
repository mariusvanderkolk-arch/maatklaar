
import { normaliseerProject as np2, voorbeeldProjecten as vp2 } from './defaults'
import { test as t2, expect as e2 } from 'vitest'
t2('voorbeeld heeft geen adres en oude kopieën worden leeggemaakt', () => {
  e2(vp2().every((p) => p.adres === '')).toBe(true)
  e2(np2({ id: 'a', voorbeeld: true, adres: 'Lindenlaan 12, Amersfoort' }).adres).toBe('')
  e2(np2({ id: 'b', adres: 'Lindenlaan 12, Amersfoort' }).adres).toBe('Lindenlaan 12, Amersfoort')
})
