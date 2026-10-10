/**
 * Planning en uren: geschatte werkdagen per taak (afgeleid van de arbeidsnormen in calc.ts),
 * een eenvoudige dag-voor-dag planning en begroot vs. werkelijk.
 * Alle functies zijn puur, datums zijn 'YYYY-MM-DD' (zonder tijdzone-gedoe).
 */
import type { ArbeidRegel } from './calc'
import type { ExtraKost, Planning, UrenLog } from './types'

export const standaardPlanning = (): Planning => ({ dagUren: 8, weekend: false, dagen: {}, droogdagen: {}, logs: [], kosten: [] })

/** Logische volgorde op de bouw. Onbekende taken komen achteraan. */
export const VOLGORDE = [
  'sloopwerk', 'leidingwerk', 'elektra', 'ventilatie', 'dekvloer', 'egaliseren', 'waterdicht', 'vloerverwarming', 'wandtegels', 'spatwand', 'vloertegels',
  'ondervloer', 'legvloer', 'plinten', 'bad', 'inloopdouche', 'toilet', 'fontein', 'wastafelmeubel', 'radiator', 'plafond', 'stucwerk', 'deur', 'kitwerk',
]

/** Droog-/wachttijd (dagen) na een taak voordat de volgende kan beginnen. */
export const DROOGTIJD: Record<string, number> = { dekvloer: 7, egaliseren: 1, waterdicht: 1, stucwerk: 1 }

export interface Taak {
  id: string
  naam: string
  /** uren volgens de arbeidsnormen */
  uren: number
  /** geschatte werkdagen (afgerond op halve dagen) */
  geschat: number
  /** gebruikte werkdagen (aangepast of geschat) */
  dagen: number
  aangepast: boolean
  droog: number
}

/** Uren → werkdagen, afgerond naar boven op halve dagen (minimaal een halve dag). */
export function urenNaarDagen(uren: number, dagUren: number): number {
  if (uren <= 0) return 0
  const d = uren / Math.max(1, dagUren)
  return Math.max(0.5, Math.ceil(d * 2 - 1e-9) / 2)
}

export function planTaken(arbeid: ArbeidRegel[], pl: Planning): Taak[] {
  const pos = (id: string) => {
    const i = VOLGORDE.indexOf(id)
    return i < 0 ? 999 : i
  }
  return [...arbeid]
    .sort((a, b) => pos(a.scope) - pos(b.scope))
    .map((a) => {
      const geschat = urenNaarDagen(a.uren, pl.dagUren)
      const eigen = pl.dagen[a.scope]
      const dagen = eigen != null && eigen >= 0 ? Math.round(eigen * 2) / 2 : geschat
      return {
        id: a.scope,
        naam: a.omschrijving,
        uren: a.uren,
        geschat,
        dagen,
        aangepast: eigen != null && Math.abs(dagen - geschat) > 1e-9,
        droog: Math.max(0, pl.droogdagen[a.scope] ?? DROOGTIJD[a.scope] ?? 0),
      }
    })
}

// — datums
const naarDate = (iso: string) => {
  const [j, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(j, (m || 1) - 1, d || 1))
}
const naarIso = (d: Date) => (isNaN(d.getTime()) ? vandaag() : d.toISOString().slice(0, 10))
export const plusDagen = (iso: string, n: number) => {
  const d = naarDate(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return naarIso(d)
}
export const isWeekend = (iso: string) => {
  const w = naarDate(iso).getUTCDay()
  return w === 0 || w === 6
}
export const vandaag = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface DagItem {
  taak: string
  naam: string
  /** deel van de dag (0,5 of 1) */
  deel: number
  soort: 'werk' | 'droog'
}

export interface Dag {
  datum: string
  items: DagItem[]
}

/**
 * Dag-voor-dag planning: taken achter elkaar, in halve dagen. Na een taak met droogtijd
 * wacht de volgende taak het opgegeven aantal kalenderdagen (droogtijd loopt door in het weekend).
 */
export function maakDagplanning(taken: Taak[], start: string, weekend: boolean): Dag[] {
  const dagen: Dag[] = []
  let datum = start
  const werkdag = (iso: string) => weekend || !isWeekend(iso)
  while (!werkdag(datum)) datum = plusDagen(datum, 1)
  let vrij = 1 // resterende capaciteit van de huidige dag
  let huidige: Dag | undefined

  const dag = () => {
    if (!huidige || huidige.datum !== datum) {
      huidige = { datum, items: [] }
      dagen.push(huidige)
    }
    return huidige
  }
  const volgendeWerkdag = () => {
    datum = plusDagen(datum, 1)
    while (!werkdag(datum)) datum = plusDagen(datum, 1)
    vrij = 1
  }

  for (const t of taken) {
    let rest = t.dagen
    while (rest > 1e-9) {
      if (vrij <= 1e-9) volgendeWerkdag()
      const deel = Math.min(rest, vrij)
      dag().items.push({ taak: t.id, naam: t.naam, deel, soort: 'werk' })
      rest -= deel
      vrij -= deel
    }
    if (t.droog > 0 && t.dagen > 0) {
      // droogtijd: de rest van deze dag + n kalenderdagen; zichtbaar op werkdagen
      let n = t.droog
      while (n > 0) {
        datum = plusDagen(datum, 1)
        vrij = 1
        if (werkdag(datum)) dag().items.push({ taak: t.id, naam: t.naam, deel: 1, soort: 'droog' })
        n--
      }
      vrij = 0 // de droogdag zelf is "bezet"; volgende taak begint de dag erna
      if (!werkdag(datum)) {
        // droogtijd eindigde in het weekend: volgende taak op de eerstvolgende werkdag
        while (!werkdag(datum)) datum = plusDagen(datum, 1)
        vrij = 1
        huidige = undefined
      }
    }
  }
  return dagen
}

export interface BudgetRegel {
  begroot: number
  werkelijk: number
}

export interface Budget {
  materiaal: BudgetRegel
  arbeid: BudgetRegel
  uren: BudgetRegel
  meerwerk: number
  overig: number
  totaal: BudgetRegel
  /** werkelijk − begroot (positief = duurder dan offerte) */
  verschil: number
  perTaak: { taak: string; naam: string; begroot: number; werkelijk: number }[]
  /** uren zonder (bekende) taak */
  overigeUren: number
}

export const somUren = (logs: UrenLog[]) => logs.reduce((s, l) => s + (Number.isFinite(l.uren) ? l.uren : 0), 0)
export const somKosten = (kosten: ExtraKost[], soort?: ExtraKost['soort']) =>
  kosten.filter((k) => !soort || k.soort === soort).reduce((s, k) => s + (Number.isFinite(k.bedrag) ? k.bedrag : 0), 0)

const cent = (n: number) => Math.round(n * 100) / 100

/** Offerte (begroot) tegenover de werkelijke uren en uitgaven. */
export function maakBudget(
  offerte: { materialen: number; arbeid: ArbeidRegel[]; uurtarief: number },
  pl: Planning,
): Budget {
  const begrootUren = offerte.arbeid.reduce((s, a) => s + a.uren, 0)
  const werkUren = somUren(pl.logs)
  const materiaal = { begroot: cent(offerte.materialen), werkelijk: cent(somKosten(pl.kosten, 'materiaal')) }
  const arbeid = { begroot: cent(begrootUren * offerte.uurtarief), werkelijk: cent(werkUren * offerte.uurtarief) }
  const meerwerk = cent(somKosten(pl.kosten, 'meerwerk'))
  const overig = cent(somKosten(pl.kosten, 'overig'))
  const totaal = { begroot: cent(materiaal.begroot + arbeid.begroot), werkelijk: cent(materiaal.werkelijk + arbeid.werkelijk + meerwerk + overig) }
  const bekend = new Set(offerte.arbeid.map((a) => a.scope))
  return {
    materiaal,
    arbeid,
    uren: { begroot: Math.round(begrootUren * 10) / 10, werkelijk: Math.round(werkUren * 10) / 10 },
    meerwerk,
    overig,
    totaal,
    verschil: cent(totaal.werkelijk - totaal.begroot),
    perTaak: offerte.arbeid.map((a) => ({
      taak: a.scope,
      naam: a.omschrijving,
      begroot: a.uren,
      werkelijk: Math.round(somUren(pl.logs.filter((l) => l.taak === a.scope)) * 10) / 10,
    })),
    overigeUren: Math.round(somUren(pl.logs.filter((l) => !l.taak || !bekend.has(l.taak))) * 10) / 10,
  }
}
