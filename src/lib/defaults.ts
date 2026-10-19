import { ALLE_SCOPE_KEYS, ruimte, scopeItems, scopeVoor } from './ruimtes'
import type { Afmetingen, LegvloerSpec, Project, ProjectType, Scope, TileSpec } from './types'

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)

export type { ScopeItem } from './ruimtes'

/** Checklist van de badkamer (oorspronkelijke lijst; gebruik `scopeItems(type)` voor andere ruimtes). */
export const SCOPE_ITEMS = scopeItems('badkamer')

export const standaardScope = (): Scope => scopeVoor('badkamer')

export const standaardAfmetingen = (type: ProjectType = 'badkamer'): Afmetingen => ({
  lengte: 2.5,
  breedte: 2.0,
  hoogte: 2.6,
  tegelhoogte: 2.6,
  openingen: [{ id: uid(), type: 'deur', breedte: type === 'toilet' ? 0.73 : 0.83, hoogte: type === 'toilet' ? 2.01 : 2.11, vanafVloer: 0 }],
  douche: { breedte: 0.9, diepte: 1.2 },
  egaliseerDikte: 3,
  spatwand: { lengte: 3.0, hoogte: 0.6 },
  ...ruimte(type).afmetingen,
})

export const LEGVLOER_PAK: Record<LegvloerSpec['soort'], number> = { laminaat: 2.22, pvc: 2.16 }
export const standaardLegvloer = (): LegvloerSpec => ({ soort: 'laminaat', m2PerPak: LEGVLOER_PAK.laminaat })

export const standaardWandtegel = (): TileSpec => ({ lengte: 60, breedte: 30, m2PerDoos: 1.44, dikte: 9, voeg: 2 })
export const standaardVloertegel = (): TileSpec => ({ lengte: 60, breedte: 60, m2PerDoos: 1.44, dikte: 10, voeg: 3 })

export function nieuwProject(velden: Partial<Project> = {}): Project {
  const nu = Date.now()
  const type = velden.type ?? 'badkamer'
  return {
    id: uid(),
    naam: '',
    klant: '',
    adres: '',
    type,
    createdAt: nu,
    updatedAt: nu,
    scope: scopeVoor(type),
    afmetingen: standaardAfmetingen(type),
    wandtegel: standaardWandtegel(),
    vloertegel: standaardVloertegel(),
    legvloer: standaardLegvloer(),
    snijverlies: ruimte(type).snijverlies,
    uurtarief: 72.5,
    onvoorzien: 5,
    fotos: [],
    afgevinkt: {},
    notities: '',
    ...velden,
  }
}

/** Voorbeeldprojecten, zodat de demo meteen iets laat zien. */
const iso = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Oude ingebouwde voorbeelden met hun vaste verschil tussen aangemaakt en bijgewerkt (ms): onaangeroerde kopieën zijn zo te herkennen. */
export const OUDE_VOORBEELDEN: Record<string, number> = {
  'badkamer-jansen': 5 * 86_400_000,
  'douche-de-vries': 8 * 86_400_000,
  'keuken-bakker': 1 * 86_400_000,
  'woonkamer-visser': 4 * 86_400_000,
}

/** Eén voorbeeldproject met alle onderdelen. */
export function voorbeeldProjecten(): Project[] {
  const dag = 86_400_000
  const nu = Date.now()
  return [
    nieuwProject({
      voorbeeldId: 'compleet-jansen',
      naam: 'Voorbeeld: badkamer Jansen (alle onderdelen)',
      klant: 'Fam. Jansen',
      adres: '',
      createdAt: nu - 6 * dag,
      updatedAt: nu - 1 * dag,
      voorbeeld: true,
      // alle onderdelen van een badkamer aan: sloop + container, ondergrond, installaties, tegelwerk, sanitair, afwerking
      scope: { ...standaardScope(), ...Object.fromEntries(ruimte('badkamer').werk.map((k) => [k, true])) },
      container: { maat: 6, soort: 'gemengd' },
      afmetingen: {
        lengte: 2.8,
        breedte: 2.2,
        hoogte: 2.6,
        tegelhoogte: 2.6,
        openingen: [
          { id: uid(), type: 'deur', breedte: 0.83, hoogte: 2.11, vanafVloer: 0 },
          { id: uid(), type: 'raam', breedte: 0.6, hoogte: 0.8, vanafVloer: 1.4 },
        ],
        douche: { breedte: 1.0, diepte: 1.2 },
        egaliseerDikte: 3,
        spatwand: { lengte: 3, hoogte: 0.6 },
      },
      wandtegel: { lengte: 60, breedte: 30, m2PerDoos: 1.44, dikte: 9, voeg: 2 },
      vloertegel: { lengte: 60, breedte: 60, m2PerDoos: 1.44, dikte: 10, voeg: 3 },
      afgevinkt: { tegellijm: true, primer: true },
      notities: 'Klant wil matte, lichte tegels. Afvoer toilet verplaatsen richting raamzijde.',
      planning: {
        start: iso(nu - 4 * dag),
        dagUren: 8,
        weekend: false,
        dagen: {},
        droogdagen: {},
        logs: [
          { id: uid(), datum: iso(nu - 4 * dag), taak: 'sloopwerk', uren: 8, omschrijving: 'Tegels en sanitair eruit' },
          { id: uid(), datum: iso(nu - 3 * dag), taak: 'sloopwerk', uren: 3.5, omschrijving: 'Afvoer puin' },
          { id: uid(), datum: iso(nu - 3 * dag), taak: 'egaliseren', uren: 4, omschrijving: '' },
        ],
        kosten: [
          { id: uid(), datum: iso(nu - 5 * dag), omschrijving: 'Bon Hornbach: lijm, primer, egaliseer', soort: 'materiaal', bedrag: 268.4 },
          { id: uid(), datum: iso(nu - 3 * dag), omschrijving: 'Afvoer toilet verplaatsen', soort: 'meerwerk', bedrag: 145 },
        ],
      },
    }),
  ]
}

/** Vult ontbrekende velden aan (oudere projecten, back-ups) zodat de app er veilig mee kan rekenen. */
/** Adressen die vroeger in de voorbeelden stonden; bestaande kopieën worden hiervan ontdaan. */
const OUDE_VOORBEELD_ADRESSEN = ['Lindenlaan 12, Amersfoort', 'Havenstraat 4, Zwolle', 'Kerkweg 31, Utrecht', 'Molenstraat 8, Deventer']

export function normaliseerProject(ruw: Partial<Project> & { id: string }): Project {
  const type: ProjectType = ruw.type && ['badkamer', 'toilet', 'keuken', 'vloer'].includes(ruw.type) ? ruw.type : 'badkamer'
  const basis = nieuwProject({ type })
  const scope = { ...Object.fromEntries(ALLE_SCOPE_KEYS.map((k) => [k, false])), ...(ruw.scope ?? basis.scope) } as Scope
  return {
    ...basis,
    ...ruw,
    type,
    scope,
    afmetingen: { ...basis.afmetingen, ...ruw.afmetingen, openingen: ruw.afmetingen?.openingen ?? basis.afmetingen.openingen },
    legvloer: { ...basis.legvloer, ...ruw.legvloer },
    fotos: ruw.fotos ?? [],
    ...(ruw.voorbeeld && OUDE_VOORBEELD_ADRESSEN.includes(String(ruw.adres ?? '').trim()) ? { adres: '' } : {}),
    afgevinkt: ruw.afgevinkt ?? {},
    notities: ruw.notities ?? '',
  }
}
