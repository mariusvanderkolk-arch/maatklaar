/**
 * 3D-weergave van een ontwerp met three.js. Wordt alleen geladen op het 3D-tabblad (lazy).
 * Eenheden in de scène: meters. x = lengte, z = breedte (y van de plattegrond), y = omhoog.
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { ITEMS, WAND_DIKTE, wandVan, type Afwerking, type Kamer, type Ontwerp, type OntwerpItem, type Wand } from './model'
import { frontKleurVan, kraanKleurVan, sanitairVan, STANDAARD_SANITAIR, type DoucheKraan, type Sanitair, type WastafelKraan } from './sanitair'
import { kiesPpc, PLEISTER, rng, tekenTegels } from './tegels'

const M = 0.01 // cm → m

// ——— materialen ————————————————————————————————————————————————

function maakMaterialen() {
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o)
  return {
    keramiek: new THREE.MeshPhysicalMaterial({ color: '#FBFAF7', roughness: 0.22, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.12 }),
    water: new THREE.MeshPhysicalMaterial({ color: '#E3EDF1', roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 }),
    goud: std({ color: '#C9A25E', metalness: 1, roughness: 0.28 }),
    chroom: std({ color: '#E4E7EA', metalness: 1, roughness: 0.12 }),
    glas: new THREE.MeshPhysicalMaterial({ color: '#E6F0F3', metalness: 0, roughness: 0.04, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    spiegel: std({ color: '#EEF3F5', metalness: 0.85, roughness: 0.07, emissive: '#7F8E96', emissiveIntensity: 0.35 }),
    front: std({ color: '#E3DACB', roughness: 0.62 }),
    plint: std({ color: '#5E554D', roughness: 0.8 }),
    zwartGlas: new THREE.MeshPhysicalMaterial({ color: '#141312', roughness: 0.08, metalness: 0.1, clearcoat: 1 }),
    antraciet: std({ color: '#3F3B38', metalness: 0.4, roughness: 0.45 }),
    radiatorWit: std({ color: '#F6F4F0', roughness: 0.35 }),
    deur: std({ color: '#F6F2EB', roughness: 0.48 }),
    staal: std({ color: '#C9CDD0', metalness: 0.9, roughness: 0.3 }),
    koelkast: std({ color: '#E9E2D6', roughness: 0.55 }),
    pleister: std({ color: PLEISTER, roughness: 0.92 }),
    wandRand: std({ color: '#E7DFD2', roughness: 0.9 }),
    wandTop: std({ color: '#4C443E', roughness: 0.9 }),
  }
}
type Mats = ReturnType<typeof maakMaterialen>

function canvasTextuur(c: HTMLCanvasElement, renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  return t
}

function textuurVan(af: Afwerking, wCm: number, hCm: number, renderer: THREE.WebGLRenderer, seed: number, max = 2048): THREE.CanvasTexture {
  const ppc = kiesPpc(wCm, hCm, max, 4)
  const c = document.createElement('canvas')
  c.width = Math.max(2, Math.round(wCm * ppc))
  c.height = Math.max(2, Math.round(hCm * ppc))
  const ctx = c.getContext('2d')!
  tekenTegels(ctx, af, 0, 0, c.width, c.height, ppc, seed)
  return canvasTextuur(c, renderer)
}

/** Wandtextuur: tegels van de vloer tot tegelhoogte (of een band achter de keuken), daarboven pleisterwerk. */
function wandTextuur(af: Afwerking, len: number, H: number, banden: [number, number][], renderer: THREE.WebGLRenderer, seed: number) {
  const ppc = kiesPpc(len, H, 2048, 4)
  const c = document.createElement('canvas')
  c.width = Math.max(2, Math.round(len * ppc))
  c.height = Math.max(2, Math.round(H * ppc))
  const ctx = c.getContext('2d')!
  ctx.fillStyle = PLEISTER
  ctx.fillRect(0, 0, c.width, c.height)
  // zachte pleisterstructuur
  const rnd = rng(seed + 99)
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '160,140,110'},${0.025 + rnd() * 0.03})`
    ctx.beginPath()
    ctx.arc(rnd() * c.width, rnd() * c.height, (4 + rnd() * 18) * ppc, 0, Math.PI * 2)
    ctx.fill()
  }
  for (const [van, tot] of banden) {
    const y1 = c.height - tot * ppc
    tekenTegels(ctx, af, 0, y1, c.width, (tot - van) * ppc, ppc, seed)
    // afwerkprofiel
    ctx.fillStyle = 'rgba(201,162,94,0.9)'
    ctx.fillRect(0, y1 - Math.max(1, 0.4 * ppc), c.width, Math.max(1, 0.4 * ppc))
  }
  const t = canvasTextuur(c, renderer)
  // UV's van de ExtrudeGeometry zijn de vormcoördinaten in meters
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  t.repeat.set(1 / (len * M), 1 / (H * M))
  return t
}

// ——— bouwstenen ————————————————————————————————————————————————

const rbox = (w: number, h: number, d: number, r: number, mat: THREE.Material) => {
  const rr = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001))
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rr), mat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}
const box = (w: number, h: number, d: number, mat: THREE.Material) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}
const cil = (r: number, h: number, mat: THREE.Material, seg = 20) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat)
  m.castShadow = true
  return m
}
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number): T => {
  o.position.set(x, y, z)
  return o
}

function kraan(mat: Mats, x: number, y: number, z: number, uitloop = 0.14): THREE.Group {
  const g = new THREE.Group()
  g.add(at(cil(0.016, 0.16, mat.goud), x, y + 0.08, z))
  const arm = cil(0.011, uitloop, mat.goud)
  arm.rotation.x = Math.PI / 2
  g.add(at(arm, x, y + 0.155, z + uitloop / 2))
  return g
}

/** Kraan uit de wand (inbouw): rozet + uitloop. z = wandvlak. */
function wandKraan(mat: Mats, x: number, y: number, z: number, uitloop: number): THREE.Group {
  const g = new THREE.Group()
  const roz = cil(0.03, 0.01, mat.goud, 24)
  roz.rotation.x = Math.PI / 2
  g.add(at(roz, x, y, z + 0.005))
  const arm = cil(0.01, uitloop, mat.goud)
  arm.rotation.x = Math.PI / 2
  g.add(at(arm, x, y, z + uitloop / 2))
  const greepje = cil(0.022, 0.012, mat.goud, 20)
  greepje.rotation.x = Math.PI / 2
  g.add(at(greepje, x, y - 0.1, z + 0.01))
  return g
}

function wastafelKraan(mat: Mats, stijl: WastafelKraan, x: number, blad: number, achter: number, uitloop: number): THREE.Group {
  if (stijl === 'wand') return wandKraan(mat, x, blad + 0.2, achter, uitloop + 0.06)
  if (stijl === 'hoog') {
    const g = new THREE.Group()
    g.add(at(cil(0.015, 0.3, mat.goud), x, blad + 0.15, achter + 0.05))
    const arm = cil(0.011, uitloop + 0.03, mat.goud)
    arm.rotation.x = Math.PI / 2
    g.add(at(arm, x, blad + 0.295, achter + 0.05 + (uitloop + 0.03) / 2))
    return g
  }
  return kraan(mat, x, blad, achter + 0.05, uitloop)
}

/** Douchekraan tegen de achterwand (lokaal z = achter). */
function doucheKraan(mat: Mats, stijl: DoucheKraan, achter: number, diep: number, hoogte = 2.12): THREE.Group {
  const g = new THREE.Group()
  const armL = Math.min(0.32, diep * 0.3)
  if (stijl === 'thermostaat') {
    g.add(at(rbox(0.3, 0.06, 0.06, 0.025, mat.goud), 0, 1.05, achter + 0.035))
    g.add(at(cil(0.011, 0.9, mat.goud), 0.1, 1.55, achter + 0.03))
    const hand = cil(0.035, 0.012, mat.goud, 24)
    hand.rotation.x = Math.PI / 2.4
    g.add(at(hand, 0.1, 1.85, achter + 0.07))
    g.add(at(cil(0.012, 0.2, mat.goud), 0.1, 1.72, achter + 0.06))
    return g
  }
  g.add(at(cil(stijl === 'inbouw' ? 0.15 : 0.13, 0.01, mat.goud, 40), 0, hoogte, achter + armL))
  if (stijl === 'inbouw') {
    // arm vanaf de wand, inbouwthermostaat als plaatje
    g.add(at(box(0.016, 0.016, armL, mat.goud), 0, hoogte + 0.02, achter + armL / 2))
    g.add(at(rbox(0.16, 0.16, 0.012, 0.01, mat.goud), 0, 1.1, achter + 0.006))
    const knop = cil(0.025, 0.03, mat.goud, 20)
    knop.rotation.x = Math.PI / 2
    g.add(at(knop, 0, 1.1, achter + 0.025))
    return g
  }
  g.add(at(box(0.016, 0.016, armL, mat.goud), 0, hoogte + 0.04, achter + armL / 2))
  g.add(at(rbox(0.18, 0.06, 0.05, 0.02, mat.goud), 0, 1.05, achter + 0.03))
  g.add(at(cil(0.012, hoogte - 1.1, mat.goud), 0.12, (hoogte + 1.1) / 2, achter + 0.03))
  return g
}

function greep(mat: Mats, x: number, y: number, z: number, breedte: number, verticaal = false): THREE.Mesh {
  const g = box(verticaal ? 0.012 : breedte, verticaal ? breedte : 0.012, 0.018, mat.goud)
  return at(g, x, y, z)
}

/** Keukenblok (onderkast/aanrecht/spoelbak/kookplaat). */
function keukenBlok(it: OntwerpItem, mat: Mats, blad: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const w = it.w * M
  const d = it.d * M
  g.add(at(box(w - 0.01, 0.1, d - 0.08, mat.plint), 0, 0.05, -0.03))
  const n = Math.max(1, Math.round(it.w / 60))
  const fw = w / n
  for (let i = 0; i < n; i++) {
    const fx = -w / 2 + fw * (i + 0.5)
    g.add(at(rbox(fw - 0.004, 0.76, d - 0.04, 0.006, mat.front), fx, 0.1 + 0.38, -0.02))
    g.add(greep(mat, fx, 0.8, d / 2 - 0.02 + 0.012, Math.min(0.32, fw * 0.6)))
  }
  g.add(at(box(w, 0.04, d, blad), 0, 0.88, 0))
  if (it.type === 'spoelbak') {
    const bw = Math.min(w - 0.16, 0.5)
    g.add(at(box(bw, 0.006, d * 0.55, mat.staal), 0, 0.9, 0.02))
    g.add(at(box(bw - 0.03, 0.004, d * 0.55 - 0.03, new THREE.MeshStandardMaterial({ color: '#8E9396', metalness: 0.9, roughness: 0.35 })), 0, 0.903, 0.02))
    g.add(kraan(mat, 0, 0.9, -d / 2 + 0.08, 0.2))
  }
  if (it.type === 'kookplaat') {
    const pw = Math.min(w - 0.1, 0.76)
    const pd = Math.min(d - 0.1, 0.5)
    g.add(at(box(pw, 0.008, pd, mat.zwartGlas), 0, 0.904, 0))
    const ringMat = new THREE.MeshStandardMaterial({ color: '#5E5852', roughness: 0.4 })
    for (const [cx, cz, rr] of [
      [-pw * 0.25, -pd * 0.2, 0.09],
      [pw * 0.25, -pd * 0.2, 0.07],
      [-pw * 0.25, pd * 0.22, 0.07],
      [pw * 0.25, pd * 0.22, 0.1],
    ] as [number, number, number][]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.0025, 6, 40), ringMat)
      ring.rotation.x = Math.PI / 2
      g.add(at(ring, cx, 0.909, cz))
    }
  }
  return g
}

/** Bouwt het 3D-model van één item in lokale coördinaten (achterkant = -z). */
function bouwItem(it: OntwerpItem, mat: Mats, tex: { hout: THREE.Material; blad: THREE.Material; meubel: THREE.Material }, san: Sanitair = STANDAARD_SANITAIR): THREE.Object3D | null {
  const def = ITEMS[it.type]
  const w = it.w * M
  const d = it.d * M
  const g = new THREE.Group()
  switch (it.type) {
    case 'douche-inloop': {
      const glasW = Math.min(w, Math.max(0.6, w * 0.7))
      const paneel = box(glasW, 2.0, 0.008, mat.glas)
      paneel.castShadow = false
      g.add(at(paneel, -w / 2 + glasW / 2, 1.0 + 0.01, d / 2 - 0.01))
      g.add(at(box(glasW, 0.012, 0.012, mat.goud), -w / 2 + glasW / 2, 2.01, d / 2 - 0.01))
      const stang = box(0.012, 0.012, d, mat.goud)
      g.add(at(stang, -w / 2 + glasW - 0.01, 2.0, 0))
      g.add(at(box(w - 0.16, 0.004, 0.035, mat.staal), 0, 0.002, -d / 2 + 0.075))
      g.add(doucheKraan(mat, san.douche, -d / 2, d))
      break
    }
    case 'douche-cabine': {
      g.add(at(rbox(w, 0.05, d, 0.012, mat.keramiek), 0, 0.025, 0))
      const p1 = box(w, 1.95, 0.008, mat.glas)
      const p2 = box(0.008, 1.95, d, mat.glas)
      p1.castShadow = p2.castShadow = false
      g.add(at(p1, 0, 1.025, d / 2 - 0.005))
      g.add(at(p2, w / 2 - 0.005, 1.025, 0))
      g.add(at(box(w, 0.015, 0.015, mat.goud), 0, 2.0, d / 2 - 0.005))
      g.add(at(box(0.015, 0.015, d, mat.goud), w / 2 - 0.005, 2.0, 0))
      g.add(doucheKraan(mat, san.douche, -d / 2, Math.min(d, 0.8), 2.05))
      break
    }
    case 'bad': {
      const h = def.h * M
      g.add(at(rbox(w, h, d, 0.05, mat.keramiek), 0, h / 2, 0))
      const binnen = rbox(w - 0.14, 0.02, d - 0.14, 0.008, mat.water)
      binnen.castShadow = false
      g.add(at(binnen, 0, h - 0.035, 0))
      if (san.bad === 'rand') g.add(kraan(mat, -w / 2 + 0.05, h, 0, 0.1))
      else g.add(wandKraan(mat, 0, h + 0.15, -d / 2, 0.16))
      break
    }
    case 'toilet-hangend':
    case 'toilet-staand': {
      const staand = it.type === 'toilet-staand'
      const tank = staand ? Math.min(0.2, d * 0.3) : 0.06
      const pot = d - tank
      const bodem = staand ? 0 : 0.18
      const potH = 0.42 - bodem
      g.add(at(rbox(w, potH, pot, Math.min(0.14, w / 2), mat.keramiek), 0, bodem + potH / 2, -d / 2 + tank + pot / 2))
      g.add(at(rbox(w * 0.94, 0.03, pot * 0.92, 0.12, mat.keramiek), 0, 0.435, -d / 2 + tank + pot * 0.48))
      if (staand) {
        g.add(at(rbox(w * 0.95, 0.38, tank, 0.03, mat.keramiek), 0, 0.42 + 0.19, -d / 2 + tank / 2))
        g.add(at(cil(0.02, 0.01, mat.goud), 0, 0.805, -d / 2 + tank / 2))
      } else {
        g.add(at(rbox(w * 0.6, 0.2, tank, 0.02, mat.keramiek), 0, 0.3, -d / 2 + tank / 2))
        g.add(at(rbox(0.24, 0.16, 0.012, 0.01, mat.goud), 0, 1.0, -d / 2 + 0.006))
      }
      break
    }
    case 'wastafel':
    case 'fontein': {
      const h = def.h * M
      const z0 = def.z * M
      g.add(at(rbox(w, h, d, 0.04, mat.keramiek), 0, z0 + h / 2, 0))
      const kom = rbox(w * 0.72, 0.02, d * 0.55, 0.02, mat.water)
      kom.castShadow = false
      g.add(at(kom, 0, z0 + h - 0.012, d * 0.08))
      g.add(wastafelKraan(mat, san.wastafel, 0, z0 + h, -d / 2, 0.1))
      break
    }
    case 'badmeubel':
    case 'badmeubel-dubbel': {
      const z0 = def.z * M
      g.add(at(rbox(w, 0.45, d - 0.01, 0.008, tex.meubel), 0, z0 + 0.225, -0.005))
      g.add(at(box(w - 0.02, 0.003, 0.002, mat.plint), 0, z0 + 0.225, d / 2 - 0.009))
      g.add(greep(mat, 0, z0 + 0.4, d / 2 - 0.004, Math.min(0.4, w * 0.5)))
      g.add(greep(mat, 0, z0 + 0.18, d / 2 - 0.004, Math.min(0.4, w * 0.5)))
      g.add(at(rbox(w, 0.1, d, 0.02, mat.keramiek), 0, z0 + 0.5, 0))
      const n = it.w >= 110 || it.type === 'badmeubel-dubbel' ? 2 : 1
      for (let i = 0; i < n; i++) {
        const cx = n === 1 ? 0 : i === 0 ? -w / 4 : w / 4
        const kom = rbox(Math.min(w - 0.1, 0.6) / n, 0.02, d * 0.55, 0.02, mat.water)
        kom.castShadow = false
        g.add(at(kom, cx, z0 + 0.542, d * 0.08))
        g.add(wastafelKraan(mat, san.wastafel, cx, z0 + 0.55, -d / 2, 0.11))
      }
      break
    }
    case 'spiegel': {
      const h = def.h * M
      g.add(at(rbox(w, h, 0.025, 0.02, mat.spiegel), 0, def.z * M + h / 2, -d / 2 + 0.0125))
      g.add(at(box(w * 0.9, 0.008, 0.01, new THREE.MeshStandardMaterial({ color: '#FFF4DD', emissive: '#FFE7B8', emissiveIntensity: 1.2 })), 0, def.z * M + h + 0.005, -d / 2 + 0.03))
      break
    }
    case 'handdoekradiator': {
      const h = def.h * M
      const z0 = def.z * M
      for (const sx of [-w / 2 + 0.015, w / 2 - 0.015]) g.add(at(cil(0.014, h, mat.goud), sx, z0 + h / 2, 0))
      const n = Math.round(h / 0.1)
      for (let i = 0; i < n; i++) {
        const bar = cil(0.009, w - 0.03, mat.goud, 12)
        bar.rotation.z = Math.PI / 2
        g.add(at(bar, 0, z0 + 0.05 + (i * (h - 0.1)) / Math.max(1, n - 1), 0))
      }
      break
    }
    case 'radiator': {
      const h = def.h * M
      g.add(at(rbox(w, h, d * 0.8, 0.01, mat.radiatorWit), 0, def.z * M + h / 2, 0))
      break
    }
    case 'onderkast':
    case 'aanrecht':
    case 'spoelbak':
    case 'kookplaat':
      return keukenBlok(it, mat, tex.blad)
    case 'bovenkast': {
      const h = def.h * M
      const n = Math.max(1, Math.round(it.w / 60))
      const fw = w / n
      for (let i = 0; i < n; i++) {
        const fx = -w / 2 + fw * (i + 0.5)
        g.add(at(rbox(fw - 0.004, h, d, 0.006, mat.front), fx, def.z * M + h / 2, 0))
        g.add(greep(mat, fx, def.z * M + 0.04, d / 2 + 0.01, Math.min(0.28, fw * 0.5)))
      }
      break
    }
    case 'kolomkast': {
      const h = def.h * M
      const z0 = def.z * M
      g.add(at(rbox(w, h, d - 0.01, 0.008, tex.meubel), 0, z0 + h / 2, -0.005))
      g.add(at(box(w - 0.02, 0.003, 0.002, mat.plint), 0, z0 + h * 0.62, d / 2 - 0.009))
      g.add(greep(mat, w / 2 - 0.04, z0 + h * 0.45, d / 2, 0.22, true))
      break
    }
    case 'spiegelkast': {
      const h = def.h * M
      const z0 = def.z * M
      g.add(at(rbox(w, h, d - 0.02, 0.006, mat.front), 0, z0 + h / 2, -0.01))
      const n = it.w >= 70 ? 2 : 1
      for (let i = 0; i < n; i++) {
        const fw = w / n
        g.add(at(rbox(fw - 0.006, h - 0.01, 0.012, 0.004, mat.spiegel), -w / 2 + fw * (i + 0.5), z0 + h / 2, d / 2 - 0.012))
      }
      g.add(at(box(w * 0.9, 0.008, 0.01, new THREE.MeshStandardMaterial({ color: '#FFF4DD', emissive: '#FFE7B8', emissiveIntensity: 1.2 })), 0, z0 - 0.006, d / 2 - 0.03))
      break
    }
    case 'bad-vrijstaand': {
      const h = def.h * M
      const kuip = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.42, h, 48, 1), mat.keramiek)
      kuip.scale.set(w, 1, d)
      kuip.castShadow = kuip.receiveShadow = true
      g.add(at(kuip, 0, h / 2, 0))
      const water = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.01, 48), mat.water)
      water.scale.set(w - 0.12, 1, d - 0.12)
      g.add(at(water, 0, h - 0.04, 0))
      if (san.bad === 'rand') {
        g.add(kraan(mat, -w / 2 + 0.1, h - 0.02, 0, 0.1))
      } else if (san.bad === 'wand') {
        g.add(wandKraan(mat, 0, h + 0.2, -d / 2 - 0.12, 0.2))
      } else {
        // vloerkraan aan het hoofdeinde
        g.add(at(cil(0.014, h + 0.25, mat.goud), -w / 2 - 0.1, (h + 0.25) / 2, 0))
        const arm = cil(0.01, 0.16, mat.goud)
        arm.rotation.z = Math.PI / 2
        g.add(at(arm, -w / 2 - 0.03, h + 0.24, 0))
        g.add(at(cil(0.03, 0.01, mat.goud, 24), -w / 2 - 0.1, 0.005, 0))
      }
      break
    }
    case 'waskom': {
      const z0 = def.z * M
      g.add(at(rbox(w, 0.06, d, 0.006, tex.meubel), 0, z0 + 0.03, 0))
      const n = it.w >= 110 ? 2 : 1
      for (let i = 0; i < n; i++) {
        const cx = n === 1 ? 0 : i === 0 ? -w / 4 : w / 4
        const r = Math.min(d * 0.36, 0.2)
        const kom = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.7, 0.14, 40), mat.keramiek)
        kom.castShadow = true
        g.add(at(kom, cx, z0 + 0.13, d * 0.06))
        const water = cil(r - 0.02, 0.005, mat.water, 40)
        g.add(at(water, cx, z0 + 0.2, d * 0.06))
        g.add(wastafelKraan(mat, san.wastafel === 'opbouw' ? 'hoog' : san.wastafel, cx, z0 + 0.06, -d / 2, 0.14))
      }
      break
    }
    case 'douchewand': {
      const h = def.h * M
      const p = box(w, h, Math.max(0.008, d), mat.glas)
      p.castShadow = false
      g.add(at(p, 0, h / 2 + 0.01, 0))
      g.add(at(box(w, 0.012, 0.012, mat.goud), 0, h + 0.01, 0))
      g.add(at(box(0.012, 0.012, 0.6, mat.goud), w / 2 - 0.006, h, 0.3))
      break
    }
    case 'nis': {
      const h = def.h * M
      const z0 = def.z * M
      // inbouwnis: donkere achterkant + gouden profiel; ligt tegen de wand
      g.add(at(box(w, h, 0.006, mat.plint), 0, z0 + h / 2, -d / 2 + 0.003))
      g.add(at(box(w, 0.012, d, mat.keramiek), 0, z0 + 0.006, 0))
      for (const sx of [-w / 2, w / 2]) g.add(at(box(0.006, h, d, mat.goud), sx, z0 + h / 2, 0))
      g.add(at(box(w, 0.006, d, mat.goud), 0, z0 + h, 0))
      break
    }
    case 'ombouw': {
      const h = def.h * M
      g.add(at(box(w, h, d, mat.wandRand), 0, h / 2, 0))
      g.add(at(box(w, 0.02, d + 0.01, mat.keramiek), 0, h + 0.01, 0))
      break
    }
    case 'koelkast':
    case 'kast': {
      const h = def.h * M
      const m = it.type === 'koelkast' ? mat.koelkast : tex.hout
      g.add(at(rbox(w, h, d - 0.01, 0.008, m), 0, h / 2, -0.005))
      if (it.type === 'koelkast') {
        g.add(at(box(w - 0.01, 0.004, 0.002, mat.plint), 0, 1.2, d / 2 - 0.009))
        g.add(greep(mat, w / 2 - 0.05, 1.45, d / 2, 0.3, true))
        g.add(greep(mat, w / 2 - 0.05, 0.95, d / 2, 0.3, true))
      } else {
        g.add(greep(mat, w * 0.18, 1.05, d / 2, 0.3, true))
        if (it.w >= 80) g.add(greep(mat, -w * 0.18, 1.05, d / 2, 0.3, true))
      }
      break
    }
    default:
      return null
  }
  return g
}

/** Deur of raam in het wandgat (lokale coördinaten van de wand: x langs de wand, y omhoog, z = dikte naar binnen). */
function bouwOpening(it: OntwerpItem, mat: Mats, lokaalX: number, T: number): THREE.Group {
  const def = ITEMS[it.type]
  const g = new THREE.Group()
  const w = it.w * M
  const h = def.h * M
  const z0 = def.z * M
  const kozijn = 0.045
  const kz = -T / 2
  const frame = mat.deur
  g.add(at(box(kozijn, h, T + 0.01, frame), lokaalX - w / 2 + kozijn / 2, z0 + h / 2, kz))
  g.add(at(box(kozijn, h, T + 0.01, frame), lokaalX + w / 2 - kozijn / 2, z0 + h / 2, kz))
  g.add(at(box(w, kozijn, T + 0.01, frame), lokaalX, z0 + h - kozijn / 2, kz))
  if (it.type === 'deur') {
    g.add(at(box(w - kozijn * 2, h - kozijn, 0.04, mat.deur), lokaalX, (h - kozijn) / 2, -0.02))
    g.add(at(box(0.12, 0.016, 0.02, mat.goud), lokaalX + w / 2 - kozijn - 0.09, 1.05, 0.012))
    g.add(at(box(0.04, 0.12, 0.008, mat.goud), lokaalX + w / 2 - kozijn - 0.06, 1.0, 0.004))
  } else {
    g.add(at(box(w, kozijn, T + 0.01, frame), lokaalX, z0 + kozijn / 2, kz))
    const ruit = box(w - kozijn * 2, h - kozijn * 2, 0.008, new THREE.MeshPhysicalMaterial({ color: '#CFE3EC', roughness: 0.02, transparent: true, opacity: 0.35, metalness: 0.1 }))
    ruit.castShadow = false
    g.add(at(ruit, lokaalX, z0 + h / 2, kz))
    g.add(at(box(w + 0.06, 0.025, 0.06, mat.keramiek), lokaalX, z0 - 0.0125, 0.02))
  }
  return g
}

// ——— wanden ————————————————————————————————————————————————————

interface WandObj {
  wand: Wand
  vol: THREE.Group
  /** lage wandrand die zichtbaar is als de volle wand naar de camera wijst */
  laag: THREE.Group
}

function bouwWanden(k: Kamer, o: Ontwerp, mat: Mats, renderer: THREE.WebGLRenderer): WandObj[] {
  const T = WAND_DIKTE
  const H = k.H
  const uit: WandObj[] = []
  const keuken = k.type === 'keuken'
  const spec: { wand: Wand; len: number; pos: [number, number]; rotY: number; lokaal: (it: OntwerpItem) => number }[] = [
    { wand: 'boven', len: k.L + 2 * T, pos: [-T, 0], rotY: 0, lokaal: (it) => it.x + T },
    { wand: 'onder', len: k.L + 2 * T, pos: [k.L + T, k.B], rotY: Math.PI, lokaal: (it) => k.L + T - it.x },
    { wand: 'links', len: k.B, pos: [0, k.B], rotY: Math.PI / 2, lokaal: (it) => k.B - it.y },
    { wand: 'rechts', len: k.B, pos: [k.L, 0], rotY: -Math.PI / 2, lokaal: (it) => it.y },
  ]
  spec.forEach((s, i) => {
    const openingen = o.items.filter((it) => ITEMS[it.type].montage === 'in' && wandVan(it, k) === s.wand)
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.lineTo(s.len * M, 0)
    shape.lineTo(s.len * M, H * M)
    shape.lineTo(0, H * M)
    shape.lineTo(0, 0)
    for (const it of openingen) {
      const def = ITEMS[it.type]
      const lx = s.lokaal(it)
      const x1 = Math.max(0.01, (lx - it.w / 2) * M)
      const x2 = Math.min(s.len * M - 0.01, (lx + it.w / 2) * M)
      const y1 = Math.max(def.z === 0 ? 0.0 : 0.01, def.z * M)
      const y2 = Math.min(H * M - 0.02, (def.z + def.h) * M)
      const gat = new THREE.Path()
      if (y1 <= 0) {
        // deur: gat tot de vloer → vorm aanpassen is complex; gebruik een minimale drempel
        gat.moveTo(x1, 0.002)
      } else gat.moveTo(x1, y1)
      gat.lineTo(x2, Math.max(y1, 0.002))
      gat.lineTo(x2, y2)
      gat.lineTo(x1, y2)
      shape.holes.push(gat)
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: T * M, bevelEnabled: false })
    geo.translate(0, 0, -T * M)
    // tegels: badkamer/toilet tot tegelhoogte; keuken: band achter de werkbladen op deze wand
    const banden: [number, number][] = []
    if (k.tegelH > 0) banden.push([0, k.tegelH])
    else if (keuken && o.items.some((it) => ITEMS[it.type].groep === 'keuken' && wandVan(it, k) === s.wand)) banden.push([90, 145])
    const tex = wandTextuur(o.wand, s.len, H, banden, renderer, 11 + i * 7)
    const binnen = new THREE.MeshStandardMaterial({ map: tex, roughness: kleurRuwheid(o.wand), metalness: 0 })
    const mesh = new THREE.Mesh(geo, [binnen, mat.wandRand])
    mesh.receiveShadow = true
    mesh.castShadow = true
    const vol = new THREE.Group()
    vol.add(mesh)
    // bovenkant donker (doorsnede), zoals in een ontwerptekening
    const top = new THREE.Mesh(new THREE.BoxGeometry(s.len * M, 0.004, T * M), mat.wandTop)
    top.position.set((s.len * M) / 2, H * M + 0.002, (-T * M) / 2)
    vol.add(top)
    for (const it of openingen) vol.add(bouwOpening(it, mat, s.lokaal(it) * M, T * M))
    vol.position.set(s.pos[0] * M, 0, s.pos[1] * M)
    vol.rotation.y = s.rotY
    // lage variant als de wand naar de camera wijst
    const laag = new THREE.Mesh(new THREE.BoxGeometry(s.len * M, 0.12, T * M), mat.wandRand)
    laag.position.set((s.len * M) / 2, 0.06, (-T * M) / 2)
    const laagTop = new THREE.Mesh(new THREE.BoxGeometry(s.len * M, 0.004, T * M), mat.wandTop)
    laagTop.position.set((s.len * M) / 2, 0.122, (-T * M) / 2)
    const laagGroep = new THREE.Group()
    laagGroep.add(laag, laagTop)
    laagGroep.position.copy(vol.position)
    laagGroep.rotation.y = s.rotY
    laag.receiveShadow = true
    laagGroep.visible = false
    uit.push({ wand: s.wand, vol, laag: laagGroep })
  })
  return uit
}

function kleurRuwheid(af: Afwerking) {
  return af.kleur === 'marmer' || af.kleur === 'calacatta' || af.kleur === 'salie' || af.kleur === 'terracotta' ? 0.22 : af.kleur === 'eiken' ? 0.6 : 0.5
}

// ——— viewer ——————————————————————————————————————————————————————

export interface Viewer {
  zet(k: Kamer, o: Ontwerp): void
  foto(breedte?: number, hoogte?: number, type?: 'image/png' | 'image/jpeg'): string
  herstelCamera(): void
  /** Mooie vaste camerastandpunten met beter licht; geeft een data-URL (of null als het standpunt niet bestaat). */
  impressie(standpunt: Standpunt, breedte: number, hoogte: number, type?: 'image/png' | 'image/jpeg'): string | null
  /** Welke standpunten in dit ontwerp mogelijk zijn. */
  standpunten(): Standpunt[]
  vernietig(): void
}

export type Standpunt = 'overzicht' | 'deur' | 'douche' | 'bad'
export const STANDPUNT_NAAM: Record<Standpunt, string> = { overzicht: 'Overzicht', deur: 'Vanuit de deur', douche: 'Douchehoek', bad: 'Badhoek' }

export function maakViewer(houder: HTMLElement): Viewer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.86
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.touchAction = 'none'
  houder.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#EEE6D8')
  const pmrem = new THREE.PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = env
  scene.environmentIntensity = 0.45

  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.maxPolarAngle = Math.PI * 0.47
  controls.minPolarAngle = 0.05
  controls.screenSpacePanning = true
  controls.rotateSpeed = 0.8

  const hemi = new THREE.HemisphereLight('#FFF6EA', '#BFAE94', 0.7)
  scene.add(hemi)
  const zon = new THREE.DirectionalLight('#FFF0DA', 1.7)
  zon.castShadow = true
  zon.shadow.mapSize.set(2048, 2048)
  zon.shadow.radius = 5
  zon.shadow.bias = -0.0004
  zon.shadow.normalBias = 0.02
  scene.add(zon)
  scene.add(zon.target)
  const binnenLicht = new THREE.PointLight('#FFE6C2', 0.9, 0, 2)
  scene.add(binnenLicht)

  // zachte schaduw op de 'tafel' rondom
  const grond = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ color: '#7A6A55', opacity: 0.12 }))
  grond.rotation.x = -Math.PI / 2
  grond.position.y = -0.002
  grond.receiveShadow = true
  scene.add(grond)

  const mat = maakMaterialen()
  let inhoud = new THREE.Group()
  scene.add(inhoud)
  let wanden: WandObj[] = []
  let wandItems: { obj: THREE.Object3D; wand: Wand }[] = []
  let kamer: Kamer | null = null
  let ontwerpNu: Ontwerp | null = null
  let camAangeraakt = false
  controls.addEventListener('start', () => (camAangeraakt = true))
  let extraTex: THREE.Texture[] = []

  const ruimOp = (g: THREE.Object3D) => {
    g.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : []
      for (const x of mats) {
        if (Object.values(mat).includes(x as never)) continue
        ;(x as THREE.MeshStandardMaterial).map?.dispose()
        x.dispose()
      }
    })
  }

  let gepland = false
  const render = () => {
    gepland = false
    controls.update()
    werkWandenBij()
    renderer.render(scene, camera)
  }
  const vraagRender = () => {
    if (!gepland) {
      gepland = true
      requestAnimationFrame(render)
    }
  }
  controls.addEventListener('change', vraagRender)

  function werkWandenBij() {
    if (!kamer) return
    const c = camera.position
    const L = kamer.L * M
    const B = kamer.B * M
    const verborgen: Record<Wand, boolean> = { boven: c.z < -0.05, onder: c.z > B + 0.05, links: c.x < -0.05, rechts: c.x > L + 0.05 }
    // van bovenaf (bijna loodrecht) alle wanden tonen
    const vanBoven = controls.getPolarAngle() < 0.35
    for (const w of wanden) {
      const weg = verborgen[w.wand] && !vanBoven
      w.vol.visible = !weg
      w.laag.visible = weg
    }
    for (const wi of wandItems) wi.obj.visible = !(verborgen[wi.wand] && !vanBoven)
  }

  function maatVoor() {
    const r = houder.getBoundingClientRect()
    const w = Math.max(50, Math.round(r.width))
    const h = Math.max(50, Math.round(r.height))
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    if (!camAangeraakt) zetCamera(camera.aspect)
    vraagRender()
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(maatVoor) : null
  ro?.observe(houder)
  maatVoor()

  /** Afstand waarop de hele ruimte (bol om de kamer) in beeld past, rekening houdend met staand/liggend scherm. */
  function pasAfstand(aspect: number) {
    if (!kamer) return 5
    const L = kamer.L * M
    const B = kamer.B * M
    const H = kamer.H * M
    const straal = Math.sqrt(L * L + B * B + H * H * 0.5) / 2
    const vfov = THREE.MathUtils.degToRad(camera.fov)
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect)
    return (straal / Math.sin(Math.min(vfov, hfov) / 2)) * (aspect > 1 ? 1.12 : 0.95)
  }

  function zetCamera(aspect: number) {
    if (!kamer) return
    const L = kamer.L * M
    const B = kamer.B * M
    const doel = new THREE.Vector3(L / 2, kamer.H * M * 0.36, B / 2)
    controls.target.copy(doel)
    const afstand = pasAfstand(aspect)
    const sph = new THREE.Spherical(afstand, THREE.MathUtils.degToRad(52), THREE.MathUtils.degToRad(36))
    camera.position.copy(new THREE.Vector3().setFromSpherical(sph).add(doel))
    controls.minDistance = 0.8
    controls.maxDistance = afstand * 2.2
    controls.update()
  }

  function herstelCamera() {
    camAangeraakt = false
    zetCamera(camera.aspect)
    vraagRender()
  }

  function zet(k: Kamer, o: Ontwerp) {
    const eerste = !kamer || kamer.L !== k.L || kamer.B !== k.B
    kamer = k
    ontwerpNu = o
    scene.remove(inhoud)
    ruimOp(inhoud)
    for (const w of wanden) {
      scene.remove(w.laag)
      ruimOp(w.laag)
    }
    for (const t of extraTex) t.dispose()
    extraTex = []
    inhoud = new THREE.Group()
    const L = k.L * M
    const B = k.B * M

    // vloer
    const vloerTex = textuurVan(o.vloer, k.L, k.B, renderer, 7)
    const vloer = new THREE.Mesh(new THREE.PlaneGeometry(L, B), new THREE.MeshStandardMaterial({ map: vloerTex, roughness: Math.min(0.85, kleurRuwheid(o.vloer) + 0.22), metalness: 0 }))
    vloer.rotation.x = -Math.PI / 2
    vloer.position.set(L / 2, 0, B / 2)
    vloer.receiveShadow = true
    inhoud.add(vloer)
    // sokkel onder de ruimte
    const T = WAND_DIKTE * M
    const sokkel = box(L + 2 * T, 0.06, B + 2 * T, mat.wandTop)
    sokkel.position.set(L / 2, -0.031, B / 2)
    inhoud.add(sokkel)

    // hout/blad-texturen voor meubels
    const houtTex = textuurVan({ kleur: 'eiken', formaat: 'plank', verband: 'recht' }, 120, 60, renderer, 3, 512)
    const bladTex = textuurVan({ kleur: o.blad?.kleur ?? 'marmer', formaat: '60x120', verband: 'recht' }, 240, 120, renderer, 5, 1024)
    houtTex.wrapS = houtTex.wrapT = THREE.RepeatWrapping
    bladTex.wrapS = bladTex.wrapT = THREE.RepeatWrapping
    extraTex.push(houtTex, bladTex)
    const san = sanitairVan(o.sanitair)
    const kk = kraanKleurVan(san.kraan)
    mat.goud.color.set(kk.kleur)
    mat.goud.roughness = kk.ruw
    mat.goud.metalness = kk.metaal
    const fk = frontKleurVan(san.front)
    let meubelMat: THREE.Material
    if (fk.hout) {
      const t = textuurVan({ kleur: fk.id === 'noten' ? 'notelaar' : 'eiken', formaat: 'plank', verband: 'recht' }, 120, 60, renderer, 4, 512)
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      extraTex.push(t)
      meubelMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 })
    } else meubelMat = new THREE.MeshStandardMaterial({ color: fk.kleur, roughness: 0.6 })
    const tex = {
      meubel: meubelMat,
      hout: new THREE.MeshStandardMaterial({ map: houtTex, roughness: 0.55 }),
      blad: new THREE.MeshPhysicalMaterial({ map: o.blad?.metaal ? null : bladTex, color: o.blad?.metaal ? '#C9CED2' : '#FFFFFF', roughness: o.blad?.ruw ?? 0.2, metalness: o.blad?.metaal ?? 0, clearcoat: (o.blad?.ruw ?? 0.2) < 0.3 ? 0.5 : 0.1 }),
    }

    wanden = bouwWanden(k, o, mat, renderer)
    for (const w of wanden) {
      inhoud.add(w.vol)
      scene.add(w.laag)
    }
    wandItems = []
    for (const it of o.items) {
      if (ITEMS[it.type].montage === 'in') continue
      const obj = bouwItem(it, mat, tex, san)
      if (!obj) continue
      obj.position.set(it.x * M, 0, it.y * M)
      obj.rotation.y = (-it.rot * Math.PI) / 180
      inhoud.add(obj)
      const plat = it.type === 'spiegel' || it.type === 'handdoekradiator' || it.type === 'radiator' || it.type === 'bovenkast'
      const w = plat ? wandVan(it, k) : null
      if (w) wandItems.push({ obj, wand: w })
    }
    scene.add(inhoud)

    // licht passend bij de ruimte
    const r = Math.max(L, B)
    // zon van linksvoor-boven: achterwanden licht, slagschaduw valt naar achteren (buiten beeld)
    zon.position.set(L * 0.2 - r * 0.7, k.H * M * 2.4, B + r * 0.9)
    zon.target.position.set(L / 2, 0, B / 2)
    const sc = zon.shadow.camera
    sc.left = -r * 1.2
    sc.right = r * 1.2
    sc.top = r * 1.2
    sc.bottom = -r * 1.2
    sc.near = 0.5
    sc.far = 20
    sc.updateProjectionMatrix()
    binnenLicht.position.set(L / 2, k.H * M * 0.92, B / 2)
    if (eerste) herstelCamera()
    vraagRender()
  }

  function foto(breedte?: number, hoogte?: number, type: 'image/png' | 'image/jpeg' = 'image/png') {
    const oud = new THREE.Vector2()
    renderer.getSize(oud)
    const ratio = renderer.getPixelRatio()
    if (breedte && hoogte) {
      renderer.setPixelRatio(1)
      renderer.setSize(breedte, hoogte, false)
      camera.aspect = breedte / hoogte
      camera.updateProjectionMatrix()
      if (!camAangeraakt) zetCamera(camera.aspect)
    }
    controls.update()
    werkWandenBij()
    renderer.render(scene, camera)
    const url = renderer.domElement.toDataURL(type, 0.88)
    if (breedte && hoogte) {
      renderer.setPixelRatio(ratio)
      renderer.setSize(oud.x, oud.y, false)
      camera.aspect = oud.x / oud.y
      camera.updateProjectionMatrix()
      if (!camAangeraakt) zetCamera(camera.aspect)
      renderer.render(scene, camera)
    }
    return url
  }

  const vindItem = (types: string[]) => ontwerpNu?.items.find((it) => types.includes(it.type)) ?? null

  function standpunten(): Standpunt[] {
    const uit: Standpunt[] = ['overzicht', 'deur']
    if (vindItem(['douche-inloop', 'douche-cabine'])) uit.push('douche')
    if (vindItem(['bad', 'bad-vrijstaand'])) uit.push('bad')
    return uit
  }

  /** Zet camera voor een standpunt (zonder OrbitControls-begrenzing). Geeft false als niet mogelijk. */
  function zetStandpunt(sp: Standpunt, aspect: number): boolean {
    if (!kamer) return false
    const L = kamer.L * M
    const B = kamer.B * M
    const H = kamer.H * M
    const marge = 0.22
    const binnen = (v: THREE.Vector3) => v.set(THREE.MathUtils.clamp(v.x, marge, L - marge), v.y, THREE.MathUtils.clamp(v.z, marge, B - marge))
    const oog = Math.min(1.6, H * 0.68)
    const midden = new THREE.Vector3(L / 2, 0, B / 2)
    if (sp === 'overzicht') {
      camera.fov = 34
      camera.aspect = aspect
      camera.updateProjectionMatrix()
      const doel = new THREE.Vector3(L / 2, H * 0.3, B / 2)
      const sph = new THREE.Spherical(pasAfstand(aspect) * 0.98, THREE.MathUtils.degToRad(48), THREE.MathUtils.degToRad(32))
      camera.position.copy(new THREE.Vector3().setFromSpherical(sph).add(doel))
      camera.lookAt(doel)
      return true
    }
    let pos: THREE.Vector3
    let doel: THREE.Vector3
    if (sp === 'deur') {
      const d = vindItem(['deur'])
      const dp = d ? new THREE.Vector3(d.x * M, 0, d.y * M) : new THREE.Vector3(L * 0.5, 0, B)
      const richting = midden.clone().sub(dp).setY(0).normalize()
      // net buiten de deuropening: die wand wordt laag getekend, zo zie je de hele ruimte
      pos = dp.clone().addScaledVector(richting, -0.7)
      pos.y = oog
      // kijk naar het punt in de kamer het verst van de deur, iets onder ooghoogte
      doel = binnen(dp.clone().addScaledVector(richting, Math.hypot(L, B)))
      doel.lerp(midden, 0.35)
      doel.y = H * 0.4
    } else {
      const it = vindItem(sp === 'douche' ? ['douche-inloop', 'douche-cabine'] : ['bad', 'bad-vrijstaand'])
      if (!it) return false
      const ip = new THREE.Vector3(it.x * M, 0, it.y * M)
      // camera in de hoek die het verst van het item ligt
      const hoeken = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(L, 0, 0), new THREE.Vector3(0, 0, B), new THREE.Vector3(L, 0, B)]
      hoeken.sort((a, b) => b.distanceTo(ip) - a.distanceTo(ip))
      pos = hoeken[0].clone().add(hoeken[0].clone().sub(midden).setY(0).normalize().multiplyScalar(0.6))
      pos.y = oog
      doel = ip.clone()
      doel.y = sp === 'douche' ? H * 0.42 : 0.55
    }
    camera.fov = aspect >= 1 ? 50 : 62
    camera.aspect = aspect
    camera.updateProjectionMatrix()
    camera.position.copy(pos)
    camera.lookAt(doel)
    return true
  }

  function impressie(sp: Standpunt, breedte: number, hoogte: number, type: 'image/png' | 'image/jpeg' = 'image/jpeg') {
    if (!kamer) return null
    const oud = new THREE.Vector2()
    renderer.getSize(oud)
    const ratio = renderer.getPixelRatio()
    const bewaard = { pos: camera.position.clone(), q: camera.quaternion.clone(), fov: camera.fov, aspect: camera.aspect }
    const licht = { exp: renderer.toneMappingExposure, envI: scene.environmentIntensity, hemi: hemi.intensity, zon: zon.intensity, binnen: binnenLicht.intensity, bg: (scene.background as THREE.Color).clone() }
    const binnenOog = sp !== 'overzicht'
    renderer.setPixelRatio(1)
    renderer.setSize(breedte, hoogte, false)
    let url: string | null = null
    if (zetStandpunt(sp, breedte / hoogte)) {
      // impressie-licht: helderder, zachter, warmer 'plafondlicht'
      renderer.toneMappingExposure = binnenOog ? 0.9 : 0.92
      scene.environmentIntensity = 0.55
      hemi.intensity = 0.75
      zon.intensity = 1.8
      binnenLicht.intensity = binnenOog ? 1.4 : 1.2
      ;(scene.background as THREE.Color).set('#F3ECE1')
      werkWandenBij()
      renderer.render(scene, camera)
      url = renderer.domElement.toDataURL(type, 0.92)
    }
    renderer.toneMappingExposure = licht.exp
    scene.environmentIntensity = licht.envI
    hemi.intensity = licht.hemi
    zon.intensity = licht.zon
    binnenLicht.intensity = licht.binnen
    ;(scene.background as THREE.Color).copy(licht.bg)
    camera.position.copy(bewaard.pos)
    camera.quaternion.copy(bewaard.q)
    camera.fov = bewaard.fov
    renderer.setPixelRatio(ratio)
    renderer.setSize(oud.x, oud.y, false)
    camera.aspect = oud.x / oud.y
    camera.updateProjectionMatrix()
    controls.update()
    werkWandenBij()
    renderer.render(scene, camera)
    return url
  }

  function vernietig() {
    ro?.disconnect()
    controls.dispose()
    ruimOp(scene)
    for (const t of extraTex) t.dispose()
    env.dispose()
    pmrem.dispose()
    for (const m of Object.values(mat)) m.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }

  return { zet, foto, herstelCamera, impressie, standpunten, vernietig }
}
