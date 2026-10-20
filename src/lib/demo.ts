/**
 * Demo zonder account: een vast, fictief badkamerproject dat alleen in het geheugen bestaat.
 * Wordt NOOIT opgeslagen (geen localStorage/IndexedDB), nooit gesynchroniseerd en gebruikt alleen voorbeeldprijzen,
 * zodat het nooit mengt met de echte projecten, prijzen of bedrijfsgegevens van de gebruiker.
 */
import { nieuwProject, standaardScope, uid } from './defaults'
import { ruimte } from './ruimtes'
import { berekenAlles } from './useCalc'
import { voorbeeldPrijsBron } from './prices'
import { maakOfferteData } from './offerteMaken'
import { standaardBedrijf, type Bedrijf } from './bedrijf'
import type { OfferteData } from './offerte'
import type { Project } from './types'

export const DEMO_STAPPEN = ['maten', 'offerte', 'klant'] as const
export type DemoStap = (typeof DEMO_STAPPEN)[number]

export const DEMO_BEDRIJF: Bedrijf = {
  ...standaardBedrijf(),
  naam: 'Voorbeeld Bouw & Renovatie',
  adres: 'Werkweg 10, 1234 AB Voorbeeldstad',
  telefoon: '010 123 45 67',
  email: 'info@voorbeeld.nl',
  website: 'www.voorbeeld.nl',
}

const iso = (t: number) => new Date(t).toISOString().slice(0, 10)

export function demoProject(nu = Date.now()): Project {
  const scope = { ...standaardScope(), ...Object.fromEntries(ruimte('badkamer').werk.map((k) => [k, true])) }
  return nieuwProject({
    id: 'demo',
    naam: 'Renovatie badkamer – Fam. De Boer (demo)',
    klant: 'Fam. De Boer (fictief)',
    adres: 'Voorbeeldstraat 1, 1234 AB Voorbeeldstad',
    createdAt: nu,
    updatedAt: nu,
    scope: { ...scope, bad: false, fontein: false, plafond: false },
    container: { maat: 6, soort: 'gemengd' },
    afmetingen: {
      lengte: 2.4,
      breedte: 1.8,
      hoogte: 2.6,
      tegelhoogte: 2.6,
      openingen: [
        { id: uid(), type: 'deur', breedte: 0.83, hoogte: 2.11, vanafVloer: 0 },
        { id: uid(), type: 'raam', breedte: 0.6, hoogte: 0.8, vanafVloer: 1.4 },
      ],
      douche: { breedte: 0.9, diepte: 1.2 },
      egaliseerDikte: 3,
      spatwand: { lengte: 0, hoogte: 0 },
    },
    wandtegel: { lengte: 60, breedte: 30, m2PerDoos: 1.44, dikte: 9, voeg: 2 },
    vloertegel: { lengte: 60, breedte: 60, m2PerDoos: 1.44, dikte: 10, voeg: 3 },
    onvoorzien: 0,
    notities: 'Matte, lichte tegels. Inloopdouche met glaswand en regendouche.',
    offerte: { nummer: 'DEMO-001' } as Project['offerte'],
  } as Partial<Project>)
}

export function demoOfferte(nu = Date.now()): OfferteData {
  const p = demoProject(nu)
  const b = berekenAlles(p, voorbeeldPrijsBron, [])
  const d = maakOfferteData(p, b, DEMO_BEDRIJF, (x) => x)
  return { ...d, datum: iso(nu), geldigTot: iso(nu + 30 * 86_400_000) }
}
