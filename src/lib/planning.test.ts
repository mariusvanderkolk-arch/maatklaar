import { describe, expect, it } from 'vitest'
import { berekenArbeid } from './calc'
import { nieuwProject } from './defaults'
import { isWeekend, maakBudget, maakDagplanning, planTaken, planningTekst, plusDagen, standaardPlanning, urenNaarDagen, type Taak } from './planning'

const taak = (id: string, dagen: number, droog = 0): Taak => ({ id, naam: id, uren: dagen * 8, geschat: dagen, dagen, aangepast: false, droog })

describe('uren → dagen', () => {
  it('rondt naar boven af op halve dagen, minimaal een halve dag', () => {
    expect(urenNaarDagen(0, 8)).toBe(0)
    expect(urenNaarDagen(1, 8)).toBe(0.5)
    expect(urenNaarDagen(4, 8)).toBe(0.5)
    expect(urenNaarDagen(4.1, 8)).toBe(1)
    expect(urenNaarDagen(23.5, 8)).toBe(3)
    expect(urenNaarDagen(12, 6)).toBe(2)
  })
})

describe('taken', () => {
  it('volgen de bouwvolgorde en gebruiken aangepaste dagen', () => {
    const p = nieuwProject()
    const pl = { ...standaardPlanning(), dagen: { wandtegels: 4 } }
    const t = planTaken(berekenArbeid(p), pl)
    expect(t[0].id).toBe('sloopwerk')
    expect(t.findIndex((x) => x.id === 'waterdicht')).toBeLessThan(t.findIndex((x) => x.id === 'wandtegels'))
    expect(t.findIndex((x) => x.id === 'kitwerk')).toBe(t.length - 1)
    const w = t.find((x) => x.id === 'wandtegels')!
    expect(w.dagen).toBe(4)
    expect(w.aangepast).toBe(w.geschat !== 4)
    expect(t.find((x) => x.id === 'egaliseren')!.droog).toBe(1)
  })
})

describe('datums', () => {
  it('weekend en dagen optellen (ook over maandgrens)', () => {
    expect(isWeekend('2026-10-03')).toBe(true) // zaterdag
    expect(isWeekend('2026-10-05')).toBe(false)
    expect(plusDagen('2026-10-30', 3)).toBe('2026-11-02')
  })
})

describe('dagplanning', () => {
  it('plant halve dagen achter elkaar en slaat het weekend over', () => {
    // vr 2 okt 2026
    const d = maakDagplanning([taak('a', 1), taak('b', 0.5), taak('c', 1)], '2026-10-02', false)
    expect(d.map((x) => x.datum)).toEqual(['2026-10-02', '2026-10-05', '2026-10-06'])
    expect(d[1].items.map((i) => [i.taak, i.deel])).toEqual([['b', 0.5], ['c', 0.5]])
    expect(d[2].items).toEqual([{ taak: 'c', naam: 'c', deel: 0.5, soort: 'werk' }])
  })

  it('start op maandag als de startdatum in het weekend valt', () => {
    expect(maakDagplanning([taak('a', 1)], '2026-10-03', false)[0].datum).toBe('2026-10-05')
    expect(maakDagplanning([taak('a', 1)], '2026-10-03', true)[0].datum).toBe('2026-10-03')
  })

  it('droogtijd: volgende taak wacht', () => {
    const d = maakDagplanning([taak('egaliseren', 0.5, 1), taak('tegels', 1)], '2026-10-05', false)
    expect(d.map((x) => [x.datum, x.items.map((i) => `${i.taak}:${i.soort}`)])).toEqual([
      ['2026-10-05', ['egaliseren:werk']],
      ['2026-10-06', ['egaliseren:droog']],
      ['2026-10-07', ['tegels:werk']],
    ])
  })

  it('droogtijd loopt door in het weekend', () => {
    const d = maakDagplanning([taak('waterdicht', 1, 2), taak('tegels', 1)], '2026-10-02', false)
    // vr werk, za+zo drogen (niet zichtbaar), ma tegels
    expect(d.map((x) => x.datum)).toEqual(['2026-10-02', '2026-10-05'])
    expect(d[1].items[0].taak).toBe('tegels')
  })
})

describe('budget', () => {
  it('vergelijkt offerte met werkelijke uren en uitgaven', () => {
    const arbeid = [
      { scope: 'sloopwerk', omschrijving: 'Sloop', uren: 8 },
      { scope: 'wandtegels', omschrijving: 'Tegels', uren: 20 },
    ]
    const pl = {
      ...standaardPlanning(),
      logs: [
        { id: '1', datum: '2026-10-05', taak: 'sloopwerk', uren: 10, omschrijving: '' },
        { id: '2', datum: '2026-10-06', taak: 'wandtegels', uren: 8, omschrijving: '' },
        { id: '3', datum: '2026-10-06', uren: 1.5, omschrijving: 'overleg' },
      ],
      kosten: [
        { id: 'a', datum: '2026-10-05', omschrijving: 'Bon Gamma', soort: 'materiaal' as const, bedrag: 800 },
        { id: 'b', datum: '2026-10-06', omschrijving: 'Extra stopcontact', soort: 'meerwerk' as const, bedrag: 95 },
      ],
    }
    const b = maakBudget({ materialen: 1000, arbeid, uurtarief: 50 }, pl)
    expect(b.uren).toEqual({ begroot: 28, werkelijk: 19.5 })
    expect(b.arbeid).toEqual({ begroot: 1400, werkelijk: 975 })
    expect(b.materiaal).toEqual({ begroot: 1000, werkelijk: 800 })
    expect(b.meerwerk).toBe(95)
    expect(b.totaal).toEqual({ begroot: 2400, werkelijk: 1870 })
    expect(b.verschil).toBe(-530)
    expect(b.perTaak.find((t) => t.taak === 'sloopwerk')!.werkelijk).toBe(10)
    expect(b.overigeUren).toBe(1.5)
  })

  it('lege planning geeft nullen, geen NaN', () => {
    const b = maakBudget({ materialen: 0, arbeid: [], uurtarief: 60 }, standaardPlanning())
    expect(b.totaal).toEqual({ begroot: 0, werkelijk: 0 })
    expect(b.verschil).toBe(0)
  })
})

describe('planningTekst', () => {
  it('zet de dag-voor-dagplanning in gewone tekst, zonder bedragen', () => {
    const dagen = maakDagplanning([taak('sloopwerk', 1), taak('stucwerk', 0.5, 1)], '2026-11-23', false)
    const t = planningTekst({ naam: 'Badkamer Piet', klant: 'Piet', adres: 'Dorpsweg 2' }, dagen, [taak('sloopwerk', 1), taak('stucwerk', 0.5, 1)])
    expect(t).toContain('Planning – Badkamer Piet (Piet)')
    expect(t).toContain('Dorpsweg 2')
    expect(t).toContain('sloopwerk')
    expect(t).toContain('stucwerk')
    expect(t).toContain('droogtijd')
    expect(t).toContain('schatting')
    expect(t).not.toMatch(/€/)
  })

  it('zegt het als er nog geen taken zijn', () => {
    expect(planningTekst({ naam: 'X', klant: '', adres: '' }, [])).toMatch(/Nog geen taken/)
  })
})
