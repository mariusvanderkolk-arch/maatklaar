import { describe, expect, it } from 'vitest'
import { nieuwProject } from './defaults'
import { kopieerProject, metNieuweKlant } from './projectKopie'

describe('kopieerProject', () => {
  it('neemt klusgegevens mee en laat klant, offerte, foto’s en meerwerk achter', () => {
    const bron = nieuwProject({
      naam: 'Badkamer Jansen',
      klant: 'Fam. Jansen',
      adres: 'Kerkstraat 1',
      uurtarief: 80,
      marge: 15,
      onvoorzien: 5,
      notities: 'Privé-opmerking',
      fotos: [{ id: 'f1', naam: 'wand.jpg', createdAt: 1 }],
      meerwerk: [{ id: 'm1', nr: 1, datum: '2026-11-01', soort: 'meer', omschrijving: 'Extra', reden: '', modus: 'bedrag', bedrag: 100, materiaal: 0, uren: 0 }],
      offerte: { nummer: 'OF-2026-001', teken: { token: 't'.repeat(64), hash: 'h', nr: 'OF-2026-001', code: '', gedeeldOp: 1 } },
      planning: { dagUren: 7, weekend: true, dagen: { sloopwerk: 2 }, droogdagen: {}, logs: [{ id: 'l1', datum: '2026-11-02', uren: 8, omschrijving: 'sloop' }], kosten: [{ id: 'k1', datum: '2026-11-02', omschrijving: 'tegels', soort: 'materiaal', bedrag: 50 }] },
      extraArtikelen: [{ sleutel: 's1', id: 'kit-sanitair', aantal: 2 }],
      voorbeeld: true,
      voorbeeldId: 'badkamer-jansen',
    })
    bron.afmetingen.openingen[0].breedte = 0.9
    bron.scope.wandtegels = true
    const k = kopieerProject(bron, { id: 'nieuw', nu: 1_700_000_000_000 })

    expect(k.id).toBe('nieuw')
    expect(k.createdAt).toBe(1_700_000_000_000)
    expect(k.naam).toBe('Kopie van Badkamer Jansen')
    expect(k.klant).toBe('')
    expect(k.adres).toBe('')
    expect(k.type).toBe(bron.type)
    expect(k.uurtarief).toBe(80)
    expect(k.marge).toBe(15)
    expect(k.onvoorzien).toBe(5)
    expect(k.scope.wandtegels).toBe(true)
    expect(k.afmetingen.lengte).toBe(bron.afmetingen.lengte)
    expect(k.afmetingen.openingen[0].breedte).toBe(0.9)
    expect(k.afmetingen.openingen[0].id).not.toBe(bron.afmetingen.openingen[0].id)
    expect(k.fotos).toEqual([])
    expect(k.notities).toBe('')
    expect(k.meerwerk).toBeUndefined()
    expect(k.offerte).toBeUndefined()
    expect(k.voorbeeld).toBeUndefined()
    expect(k.voorbeeldId).toBeUndefined()
    expect(k.planning?.dagUren).toBe(7)
    expect(k.planning?.weekend).toBe(true)
    expect(k.planning?.dagen.sloopwerk).toBe(2)
    expect(k.planning?.logs).toEqual([])
    expect(k.planning?.kosten).toEqual([])
    expect(k.planning?.start).toBeUndefined()
    expect(k.extraArtikelen).toHaveLength(1)
    expect(k.extraArtikelen![0].id).toBe('kit-sanitair')
    expect(k.extraArtikelen![0].sleutel).not.toBe('s1')
  })

  it('vult nieuwe klantgegevens in zonder de bron te wijzigen', () => {
    const bron = nieuwProject({ naam: 'X', klant: 'Oud' })
    const k = metNieuweKlant(kopieerProject(bron, { id: 'n' }), { naam: 'Badkamer Piet', klant: 'Piet', adres: 'Dorpsweg 2' })
    expect(k.naam).toBe('Badkamer Piet')
    expect(k.klant).toBe('Piet')
    expect(k.adres).toBe('Dorpsweg 2')
    expect(bron.klant).toBe('Oud')
  })
})
