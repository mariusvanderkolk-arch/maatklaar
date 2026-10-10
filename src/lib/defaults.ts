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
    uurtarief: 60,
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

export function voorbeeldProjecten(): Project[] {
  const dag = 86_400_000
  const nu = Date.now()
  return [
    nieuwProject({
      voorbeeldId: 'badkamer-jansen',
      naam: 'Badkamer Jansen',
      klant: 'Fam. Jansen',
      adres: 'Lindenlaan 12, Amersfoort',
      createdAt: nu - 6 * dag,
      updatedAt: nu - 1 * dag,
      voorbeeld: true,
      scope: { ...standaardScope(), vloerverwarming: true },
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
    nieuwProject({
      voorbeeldId: 'douche-de-vries',
      naam: 'Toilet & douche De Vries',
      klant: 'M. de Vries',
      adres: 'Havenstraat 4, Zwolle',
      createdAt: nu - 12 * dag,
      updatedAt: nu - 4 * dag,
      voorbeeld: true,
      scope: {
        ...scopeVoor('badkamer'),
        sloopwerk: true,
        egaliseren: false,
        waterdicht: true,
        vloerverwarming: false,
        wandtegels: true,
        vloertegels: true,
        inloopdouche: true,
        toilet: false,
        wastafelmeubel: true,
        kitwerk: true,
        stucwerk: true,
      },
      afmetingen: {
        lengte: 2.0,
        breedte: 1.7,
        hoogte: 2.5,
        tegelhoogte: 1.2,
        openingen: [{ id: uid(), type: 'deur', breedte: 0.78, hoogte: 2.01, vanafVloer: 0 }],
        douche: { breedte: 0.9, diepte: 0.9 },
        egaliseerDikte: 3,
        spatwand: { lengte: 3, hoogte: 0.6 },
      },
      wandtegel: { lengte: 20, breedte: 20, m2PerDoos: 1.0, dikte: 8, voeg: 2 },
      vloertegel: { lengte: 30, breedte: 30, m2PerDoos: 1.08, dikte: 9, voeg: 3 },
      snijverlies: 12,
      notities: 'Halfhoog betegelen, daarboven stucwerk en vochtbestendige verf.',
    }),
    nieuwProject({
      voorbeeldId: 'keuken-bakker',
      type: 'keuken',
      naam: 'Keuken Bakker',
      klant: 'S. Bakker',
      adres: 'Kerkweg 31, Utrecht',
      createdAt: nu - 3 * dag,
      updatedAt: nu - 2 * dag,
      voorbeeld: true,
      afmetingen: {
        ...standaardAfmetingen('keuken'),
        lengte: 4.2,
        breedte: 3.1,
        openingen: [{ id: uid(), type: 'deur', breedte: 0.83, hoogte: 2.11, vanafVloer: 0 }],
        spatwand: { lengte: 3.4, hoogte: 0.65 },
        egaliseerDikte: 4,
      },
      wandtegel: { lengte: 30, breedte: 7.5, m2PerDoos: 0.5, dikte: 8, voeg: 2 },
      vloertegel: { lengte: 120, breedte: 60, m2PerDoos: 1.44, dikte: 10, voeg: 3 },
      notities: 'Spatwand in zellige-look, liggend verband. Vloer doorleggen tot onder het keukenblok.',
    }),
    nieuwProject({
      voorbeeldId: 'woonkamer-visser',
      type: 'vloer',
      naam: 'Woonkamer Visser',
      klant: 'Fam. Visser',
      adres: 'Molenstraat 8, Deventer',
      createdAt: nu - 9 * dag,
      updatedAt: nu - 5 * dag,
      voorbeeld: true,
      scope: { ...scopeVoor('vloer'), egaliseren: true },
      afmetingen: {
        ...standaardAfmetingen('vloer'),
        lengte: 7.2,
        breedte: 4.6,
        openingen: [
          { id: uid(), type: 'deur', breedte: 0.83, hoogte: 2.11, vanafVloer: 0 },
          { id: uid(), type: 'deur', breedte: 1.6, hoogte: 2.11, vanafVloer: 0 },
        ],
        egaliseerDikte: 2,
      },
      legvloer: { soort: 'pvc', m2PerPak: LEGVLOER_PAK.pvc },
      notities: 'PVC visgraat-look in eiken naturel. Plinten wit, 7 cm hoog.',
    }),
  ]
}

/** Vult ontbrekende velden aan (oudere projecten, back-ups) zodat de app er veilig mee kan rekenen. */
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
    afgevinkt: ruw.afgevinkt ?? {},
    notities: ruw.notities ?? '',
  }
}
