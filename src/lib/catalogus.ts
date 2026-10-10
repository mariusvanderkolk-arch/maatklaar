/** Overzicht van alle artikelen waarvoor een prijs kan worden ingesteld (zelfde groepen als de berekening). */
import { REGELS, type Groep, type ProductId } from './calc'

export interface CatalogusItem {
  id: ProductId
  naam: string
  groep: Groep
  /** waarvoor de prijs geldt, bijv. "per m²" of "per stuk" (bij `inhoud` wordt het label afgeleid) */
  eenheid?: string
  /** artikel met een verpakkingsgrootte (eigen afwijkende inhoud mogelijk) */
  inhoud?: { standaard: number; eenheid: string; soort: string }
  toelichting?: string
}

const nl = (n: number) => new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 }).format(n)

export const CATALOGUS: CatalogusItem[] = [
  { id: 'bigbag', groep: 'sloop', naam: 'Big bag voor puin', eenheid: 'per stuk (1 m³)' },
  { id: 'afdekset', groep: 'sloop', naam: 'Afdekfolie, stucloper & stofmaskers', eenheid: 'per set' },
  { id: 'container', groep: 'sloop', naam: 'Afvalcontainer 6 m³ (incl. plaatsen en afvoeren)', eenheid: 'per stuk', toelichting: 'Bij meer dan 3 m³ sloopafval' },
  { id: 'afvalverwerking', groep: 'sloop', naam: 'Afvalverwerking (ophalen en storten)', eenheid: 'per m³' },
  { id: 'primer', groep: 'voorbereiding', naam: 'Voorstrijkmiddel (primer)', inhoud: { standaard: REGELS.primerBusL, eenheid: 'L', soort: 'bus' } },
  { id: 'egaliseer', groep: 'voorbereiding', naam: 'Egaliseermiddel', inhoud: { standaard: REGELS.egaliseerZakKg, eenheid: 'kg', soort: 'zak' } },
  { id: 'dekvloer', groep: 'voorbereiding', naam: 'Zand-cementmortel (dekvloer)', inhoud: { standaard: REGELS.dekvloerZakKg, eenheid: 'kg', soort: 'zak' } },
  { id: 'waterleiding', groep: 'leidingwerk', naam: 'Waterleiding meerlagenbuis 16 mm', eenheid: 'per meter' },
  { id: 'afvoerbuis', groep: 'leidingwerk', naam: 'Afvoerbuis PVC 40/50 mm', inhoud: { standaard: REGELS.buisLengteM, eenheid: 'm', soort: 'lengte' } },
  { id: 'afvoerbuis110', groep: 'leidingwerk', naam: 'Afvoerbuis PVC 110 mm (toilet)', eenheid: 'per lengte 2 m' },
  { id: 'koppelingen', groep: 'leidingwerk', naam: 'Fittingen, koppelingen & stopkranen', eenheid: 'per set' },
  { id: 'aardlekgroep', groep: 'elektra', naam: 'Aardlekautomaat (extra groep)', eenheid: 'per stuk' },
  { id: 'inbouwspot', groep: 'elektra', naam: 'LED-inbouwspot IP44', eenheid: 'per stuk' },
  { id: 'stopcontact', groep: 'elektra', naam: 'Stopcontact spatwaterdicht', eenheid: 'per stuk' },
  { id: 'installatiemateriaal', groep: 'elektra', naam: 'Installatiemateriaal (draad, buis, dozen, schakelaar)', eenheid: 'per set' },
  { id: 'ventilator', groep: 'elektra', naam: 'Badkamerventilator met vochtsensor', eenheid: 'per stuk' },
  { id: 'ventilatiekanaal', groep: 'elektra', naam: 'Ventilatieslang & doorvoer', eenheid: 'per set' },
  { id: 'waterdicht', groep: 'waterdicht', naam: 'Vloeibare waterdichting', inhoud: { standaard: REGELS.waterdichtEmmerKg, eenheid: 'kg', soort: 'emmer' } },
  { id: 'afdichtband', groep: 'waterdicht', naam: 'Afdichtband', inhoud: { standaard: REGELS.afdichtbandRolM, eenheid: 'm', soort: 'rol' } },
  { id: 'afdichtmanchet', groep: 'waterdicht', naam: 'Afdichtmanchetten (afvoer & leidingen)', eenheid: 'per set' },
  { id: 'vv-mat', groep: 'vloerverwarming', naam: 'Elektrische vloerverwarmingsmat', eenheid: 'per m²' },
  { id: 'vv-thermostaat', groep: 'vloerverwarming', naam: 'Klokthermostaat met vloersensor', eenheid: 'per stuk' },
  { id: 'designradiator', groep: 'vloerverwarming', naam: 'Designradiator', eenheid: 'per stuk' },
  { id: 'radiatoraansluitset', groep: 'vloerverwarming', naam: 'Radiatoraansluitset (kranen & koppelingen)', eenheid: 'per set' },
  { id: 'isolatieplaat', groep: 'vloerverwarming', naam: 'Isolatieplaat XPS 6 mm', inhoud: { standaard: REGELS.isolatieplaatM2, eenheid: 'm²', soort: 'plaat' } },
  { id: 'wandtegel', groep: 'tegels', naam: 'Wandtegels', eenheid: 'per m²', toelichting: 'm² per doos stel je per project in' },
  { id: 'vloertegel', groep: 'tegels', naam: 'Vloertegels', eenheid: 'per m²', toelichting: 'm² per doos stel je per project in' },
  { id: 'laminaat', groep: 'vloer', naam: 'Laminaat (klik, AC4)', eenheid: 'per m²', toelichting: 'm² per pak stel je per project in' },
  { id: 'pvc', groep: 'vloer', naam: 'PVC-klikvloer', eenheid: 'per m²', toelichting: 'm² per pak stel je per project in' },
  { id: 'ondervloer', groep: 'vloer', naam: 'Ondervloer', inhoud: { standaard: REGELS.ondervloerRolM2, eenheid: 'm²', soort: 'rol' } },
  { id: 'plint', groep: 'vloer', naam: 'Plinten MDF wit', inhoud: { standaard: REGELS.plintLengteM, eenheid: 'm', soort: 'lengte' } },
  { id: 'montagekit', groep: 'vloer', naam: 'Montagekit voor plinten', inhoud: { standaard: REGELS.kitKokerMl, eenheid: 'ml', soort: 'koker' } },
  { id: 'tegellijm', groep: 'lijm-voeg', naam: 'Flexibele tegellijm (C2TE S1)', inhoud: { standaard: REGELS.lijmZakKg, eenheid: 'kg', soort: 'zak' } },
  { id: 'voegmiddel', groep: 'lijm-voeg', naam: 'Flexibel voegmiddel', inhoud: { standaard: REGELS.voegZakKg, eenheid: 'kg', soort: 'zak' } },
  { id: 'tegelkruisjes', groep: 'lijm-voeg', naam: 'Tegelkruisjes / levelclips', eenheid: 'per zak' },
  { id: 'kit', groep: 'afwerking', naam: 'Sanitairkit (schimmelwerend)', inhoud: { standaard: REGELS.kitKokerMl, eenheid: 'ml', soort: 'koker' } },
  { id: 'profiel', groep: 'afwerking', naam: 'Tegelprofiel / hoekstrip aluminium', inhoud: { standaard: REGELS.profielLengteM, eenheid: 'm', soort: 'lengte' } },
  { id: 'pleister', groep: 'afwerking', naam: 'Vochtbestendige pleister', inhoud: { standaard: REGELS.pleisterZakKg, eenheid: 'kg', soort: 'zak' } },
  { id: 'verf', groep: 'afwerking', naam: 'Badkamerverf (anti-schimmel)', inhoud: { standaard: REGELS.verfBusL, eenheid: 'L', soort: 'bus' } },
  { id: 'glaswand', groep: 'sanitair', naam: 'Inloopdouche glaswand', eenheid: 'per stuk' },
  { id: 'douchegoot', groep: 'sanitair', naam: 'Douchegoot RVS', eenheid: 'per stuk' },
  { id: 'regendouche', groep: 'sanitair', naam: 'Thermostatische regendoucheset (incl. kraan)', eenheid: 'per stuk' },
  { id: 'ligbad', groep: 'sanitair', naam: 'Ligbad acryl 170 × 75 cm', eenheid: 'per stuk' },
  { id: 'badkraan', groep: 'sanitair', naam: 'Thermostatische badkraan', eenheid: 'per stuk' },
  { id: 'badafvoer', groep: 'sanitair', naam: 'Badafvoer met overloop', eenheid: 'per stuk' },
  { id: 'inbouwreservoir', groep: 'sanitair', naam: 'Inbouwreservoir', eenheid: 'per stuk' },
  { id: 'hangtoilet', groep: 'sanitair', naam: 'Hangtoilet randloos', eenheid: 'per stuk' },
  { id: 'bedieningsplaat', groep: 'sanitair', naam: 'Bedieningsplaat', eenheid: 'per stuk' },
  { id: 'wastafelmeubel', groep: 'sanitair', naam: 'Wastafelmeubel met wastafel', eenheid: 'per stuk' },
  { id: 'wastafelkraan', groep: 'sanitair', naam: 'Wastafelkraan', eenheid: 'per stuk' },
  { id: 'spiegel', groep: 'sanitair', naam: 'Spiegel met verlichting', eenheid: 'per stuk' },
  { id: 'sifon', groep: 'sanitair', naam: 'Sifon & afvoerset', eenheid: 'per stuk' },
  { id: 'fontein', groep: 'sanitair', naam: 'Fonteinset compleet', eenheid: 'per stuk' },
  { id: 'binnendeur', groep: 'timmerwerk', naam: 'Binnendeur opdek', eenheid: 'per stuk' },
  { id: 'dorpel', groep: 'timmerwerk', naam: 'Dorpel kunststeen', eenheid: 'per stuk' },
  { id: 'deurbeslag', groep: 'timmerwerk', naam: 'Deurbeslag met wc-/badkamersluiting', eenheid: 'per set' },
  { id: 'pvc-plafond', groep: 'timmerwerk', naam: 'PVC-plafondpanelen', eenheid: 'per m²' },
  { id: 'plafondprofielen', groep: 'timmerwerk', naam: 'Regelwerk & afwerkprofielen plafond', eenheid: 'per set' },
]

export const catalogusItem = (id: ProductId) => CATALOGUS.find((c) => c.id === id)

/** "per zak à 25 kg", "per m²", ... — optioneel met een afwijkende inhoud. */
export function eenheidLabel(item: CatalogusItem, inhoud?: number | null): string {
  if (item.inhoud) return `per ${item.inhoud.soort} à ${nl(inhoud ?? item.inhoud.standaard)} ${item.inhoud.eenheid}`
  return item.eenheid ?? 'per stuk'
}
