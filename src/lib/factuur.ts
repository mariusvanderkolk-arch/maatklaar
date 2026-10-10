/**
 * Facturen: aangemaakt vanuit een offerte, met eigen nummering (los van offertenummers),
 * btw-specificatie (21% en optioneel 9% op arbeid) en betaalstatus. Pure functies (testbaar).
 *
 * Bedragen in de app (offerte) zijn incl. 21% btw. Op de factuur bewaren we per regel het bedrag
 * excl. btw; het btw-tarief wordt daarover berekend. Zet je arbeid op 9%, dan blijft de prijs
 * excl. btw gelijk en daalt het btw-bedrag.
 */
import type { OfferteData } from './offerte'
import { plusDagen } from './planning'
import { formatDatum, isoDatum } from './format'

export type BtwTarief = 21 | 9
export type FactuurStatus = 'concept' | 'verzonden' | 'betaald'
export type EffectieveStatus = FactuurStatus | 'te-laat'

export interface FactuurRegel {
  id: string
  soort: 'materiaal' | 'arbeid'
  omschrijving: string
  /** bijv. "3 × doos 1,44 m²" of "6 uur × € 45,45" */
  detail: string
  /** bedrag excl. btw in euro (op centen) */
  excl: number
  btw: BtwTarief
}

export interface Factuur {
  id: string
  nummer: string
  projectId: string
  offerteNummer: string
  /** factuurdatum YYYY-MM-DD */
  datum: string
  vervaldatum: string
  status: FactuurStatus
  verzondenOp?: string
  betaaldOp?: string
  bedrijf: OfferteData['bedrijf']
  klant: string
  adres: string
  project: string
  regels: FactuurRegel[]
  notitie: string
  aangemaakt: number
}

export const STATUS_LABEL: Record<EffectieveStatus, string> = { concept: 'Concept', verzonden: 'Verzonden', betaald: 'Betaald', 'te-laat': 'Te laat' }

const cent = (n: number) => Math.round(n * 100) / 100

/** Volgnummer uit een factuurnummer, bijv. "F-2026-012" → 12. */
export function volgnummerUit(nummer: string, prefix: string): number | null {
  if (!nummer.startsWith(prefix)) return null
  const m = nummer.match(/(\d+)$/)
  return m ? parseInt(m[1], 10) : null
}

/**
 * Volgend factuurnummer. Neemt het hoogste van de teller en de bestaande facturen (+1), zodat
 * nummers nooit dalen of dubbel voorkomen, ook niet na het terugzetten van een back-up.
 */
export function volgendFactuurnummer(prefix: string, teller: number, bestaande: string[], jaar: number): { nummer: string; volgendeTeller: number } {
  const hoogste = bestaande.reduce((m, n) => Math.max(m, volgnummerUit(n, prefix) ?? 0), 0)
  const nr = Math.max(1, Math.floor(teller) || 1, hoogste + 1)
  return { nummer: `${prefix}${jaar}-${String(nr).padStart(3, '0')}`, volgendeTeller: nr + 1 }
}

export const vervaldatumVoor = (datum: string, dagen: number) => plusDagen(datum, Math.max(0, Math.round(dagen || 14)))

/** Maakt een (concept)factuur van de offertegegevens. Offertebedragen zijn incl. 21% btw. */
export function maakFactuur(d: OfferteData, o: { id: string; nummer: string; projectId: string; datum: string; betaalDagen: number; nu: number; uid: () => string }): Factuur {
  const excl = (incl: number) => cent(incl / 1.21)
  const tariefExcl = d.tarief / 1.21
  const regels: FactuurRegel[] = [
    ...d.mat.map(([oms, aantal, bedrag]) => ({ id: o.uid(), soort: 'materiaal' as const, omschrijving: oms, detail: aantal, excl: excl(bedrag), btw: 21 as BtwTarief })),
    ...d.arb.map(([oms, uren]) => ({
      id: o.uid(),
      soort: 'arbeid' as const,
      omschrijving: oms,
      detail: `${String(Math.round(uren * 10) / 10).replace('.', ',')} uur × € ${tariefExcl.toFixed(2).replace('.', ',')}`,
      excl: cent(uren * tariefExcl),
      btw: 21 as BtwTarief,
    })),
    ...(d.onv && d.onv[1] > 0
      ? [{ id: o.uid(), soort: 'materiaal' as const, omschrijving: `Onvoorzien (${String(d.onv[0]).replace('.', ',')}%)`, detail: 'stelpost', excl: excl(d.onv[1]), btw: 21 as BtwTarief }]
      : []),
  ]
  return {
    id: o.id,
    nummer: o.nummer,
    projectId: o.projectId,
    offerteNummer: d.nr,
    datum: o.datum,
    vervaldatum: vervaldatumVoor(o.datum, o.betaalDagen),
    status: 'concept',
    bedrijf: d.bedrijf,
    klant: d.klant,
    adres: d.adres,
    project: d.project,
    regels,
    notitie: '',
    aangemaakt: o.nu,
  }
}

export interface BtwOverzicht {
  perTarief: { tarief: BtwTarief; grondslag: number; btw: number }[]
  totaalExcl: number
  totaalBtw: number
  totaalIncl: number
}

/** Btw-specificatie: grondslag en btw per tarief (afgerond op centen per tarief). */
export function btwOverzicht(regels: FactuurRegel[]): BtwOverzicht {
  const perTarief = ([21, 9] as BtwTarief[])
    .map((tarief) => {
      const grondslag = cent(regels.filter((r) => r.btw === tarief).reduce((s, r) => s + r.excl, 0))
      return { tarief, grondslag, btw: cent((grondslag * tarief) / 100) }
    })
    .filter((t) => regels.some((r) => r.btw === t.tarief))
  const totaalExcl = cent(perTarief.reduce((s, t) => s + t.grondslag, 0))
  const totaalBtw = cent(perTarief.reduce((s, t) => s + t.btw, 0))
  return { perTarief, totaalExcl, totaalBtw, totaalIncl: cent(totaalExcl + totaalBtw) }
}

/** Status inclusief "te laat": een verzonden factuur waarvan de vervaldatum voorbij is. */
export function effectieveStatus(f: Pick<Factuur, 'status' | 'vervaldatum'>, vandaagIso: string): EffectieveStatus {
  if (f.status === 'verzonden' && vandaagIso > f.vervaldatum) return 'te-laat'
  return f.status
}

export function dagenTeLaat(f: Pick<Factuur, 'vervaldatum'>, vandaagIso: string): number {
  const ms = Date.parse(`${vandaagIso}T12:00:00Z`) - Date.parse(`${f.vervaldatum}T12:00:00Z`)
  return Math.max(0, Math.round(ms / 86_400_000))
}

/** Totalen voor het overzicht. */
export function factuurTotalen(facturen: Factuur[], vandaagIso: string) {
  const t = { open: 0, teLaat: 0, betaald: 0, concept: 0, aantalTeLaat: 0 }
  for (const f of facturen) {
    const bedrag = btwOverzicht(f.regels).totaalIncl
    const s = effectieveStatus(f, vandaagIso)
    if (s === 'betaald') t.betaald += bedrag
    else if (s === 'concept') t.concept += bedrag
    else {
      t.open += bedrag
      if (s === 'te-laat') {
        t.teLaat += bedrag
        t.aantalTeLaat++
      }
    }
  }
  return { ...t, open: cent(t.open), teLaat: cent(t.teLaat), betaald: cent(t.betaald), concept: cent(t.concept) }
}

/** Controleert een factuur uit een back-up; null als onbruikbaar. */
export function normaliseerFactuur(x: unknown): Factuur | null {
  const f = x as Partial<Factuur>
  if (!f || typeof f !== 'object' || typeof f.id !== 'string' || typeof f.nummer !== 'string' || !Array.isArray(f.regels)) return null
  const iso = (s: unknown, std: string) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : std)
  const datum = iso(f.datum, new Date().toISOString().slice(0, 10))
  const regels = f.regels
    .filter((r): r is FactuurRegel => !!r && typeof r === 'object' && typeof r.omschrijving === 'string' && typeof r.excl === 'number' && Number.isFinite(r.excl))
    .map((r) => ({ ...r, id: String(r.id ?? Math.random()), soort: r.soort === 'arbeid' ? 'arbeid' : 'materiaal', detail: String(r.detail ?? ''), btw: r.btw === 9 ? 9 : 21 }) as FactuurRegel)
  return {
    id: f.id,
    nummer: f.nummer,
    projectId: String(f.projectId ?? ''),
    offerteNummer: String(f.offerteNummer ?? ''),
    datum,
    vervaldatum: iso(f.vervaldatum, vervaldatumVoor(datum, 14)),
    status: f.status === 'verzonden' || f.status === 'betaald' ? f.status : 'concept',
    verzondenOp: typeof f.verzondenOp === 'string' ? f.verzondenOp : undefined,
    betaaldOp: typeof f.betaaldOp === 'string' ? f.betaaldOp : undefined,
    bedrijf: f.bedrijf && typeof f.bedrijf === 'object' ? f.bedrijf : {},
    klant: String(f.klant ?? ''),
    adres: String(f.adres ?? ''),
    project: String(f.project ?? ''),
    regels,
    notitie: String(f.notitie ?? ''),
    aangemaakt: typeof f.aangemaakt === 'number' ? f.aangemaakt : Date.now(),
  }
}

const eur = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
const datumNl = (iso: string) => formatDatum({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, isoDatum(iso))

/** Korte tekst voor delen (Web Share / kopiëren). */
export function factuurTekst(f: Factuur): string {
  const o = btwOverzicht(f.regels)
  const b = f.bedrijf
  return [
    `Factuur ${f.nummer}${b.naam ? ` van ${b.naam}` : ''}`,
    f.project ? `Project: ${f.project}` : null,
    `Factuurdatum: ${datumNl(f.datum)}`,
    `Totaal: ${eur(o.totaalIncl)} (incl. ${eur(o.totaalBtw)} btw)`,
    '',
    `Graag voldoen vóór ${datumNl(f.vervaldatum)}${b.iban ? ` op ${b.iban}${b.naam ? ` t.n.v. ${b.naam}` : ''}` : ''}, o.v.v. ${f.nummer}.`,
  ]
    .filter((r): r is string => typeof r === 'string')
    .join('\n')
}
