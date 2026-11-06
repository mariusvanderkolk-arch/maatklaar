import qrcode from 'qrcode-generator'

/** Grootste URL-lengte die we nog als leesbare QR op papier zetten. */
export const MAX_QR_LENGTE = 1200

/** QR-code als SVG-string (zwart op wit), of null als de tekst te lang is. */
export function qrSvg(tekst: string): string | null {
  if (!tekst || tekst.length > MAX_QR_LENGTE) return null
  const q = qrcode(0, 'M')
  q.addData(tekst, 'Byte')
  q.make()
  return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true })
}
