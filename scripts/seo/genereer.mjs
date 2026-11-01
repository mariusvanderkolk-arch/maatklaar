// Genereert statische, vooraf gerenderde SEO-pagina's (de app zelf gebruikt #-routes die Google slecht indexeert),
// plus sitemap.xml en robots.txt. Wordt aangeroepen vanuit vite.config.ts (seoPlugin).
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { onderwerpen } from './onderwerpen.mjs'
import { provincies as prov0, steden as st0 } from './regio.mjs'
import { stadExtra, provExtra } from './regio-extra.mjs'
const provincies = prov0.map((p) => ({ ...p, ...provExtra[p.slug] }))
const steden = st0.map((s) => ({ ...s, ...stadExtra[s.slug] }))
const praktijk = (x) => (x.praktijk || []).map(([k, t]) => `<h2>${k}</h2><p>${t}</p>`).join('\n')

const SITE = 'https://maatklaar.nl/'
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const ld = (o) => JSON.stringify(o).replace(/</g, '\\u003c')

export function seoPaginas() {
  const pag = []
  const ond = Object.fromEntries(onderwerpen.map((o) => [o.slug, o]))
  const ondLinks = onderwerpen.map((o) => [`${o.slug}/`, o.kort])
  for (const o of onderwerpen) {
    pag.push({
      pad: `${o.slug}/`, titel: `${o.titel} | Maatklaar`, meta: o.meta, h1: o.h1, kruimel: [[o.kort]],
      inhoud: `<p class="lead">${o.intro}</p>` + o.secties.map(([h, t]) => `<h2>${h}</h2>${t}`).join(''),
      faq: o.faq,
      links: [['Lees ook', o.verwant.map((s) => [`${s}/`, ond[s].kort])], ['Per regio', [['offerte-maken/', 'Alle provincies en steden']]]],
    })
  }
  const provVan = Object.fromEntries(provincies.map((p) => [p.slug, p]))
  const stedenIn = (p) => steden.filter((s) => s.prov === p)
  for (const p of provincies) {
    const st = stedenIn(p.slug)
    pag.push({
      pad: `offerte-maken/provincie-${p.slug}/`,
      titel: `Offerte maken als vakman in ${p.naam} | Maatklaar`,
      meta: `Verbouwen in ${p.naam}: waar let je op bij je offerte? Lokale aandachtspunten voor aannemers en vakmensen, plus een gratis offerte-app.`,
      h1: `Offerte maken als aannemer of vakman in ${p.naam}`,
      kruimel: [['offerte-maken/', 'Per regio'], [p.naam]],
      inhoud: `<p class="lead">Ben je aannemer, tegelzetter, installateur of klusbedrijf in ${p.naam}? Dan ken je de woningen in je regio als geen ander. Een goede offerte laat zien dat je die kennis hebt.</p>
<h2>Verbouwen in ${p.naam}</h2><p>${p.bouw}</p>
<h2>Tip voor je offerte</h2><p>${p.tip}</p>
${praktijk(p)}`,
      faq: [
        [`Waar moet ik op letten bij een offerte in ${p.naam}?`, p.tip],
        ...(p.faq ? [p.faq] : []),
      ],
      links: [[`Steden in ${p.naam}`, st.map((s) => [`offerte-maken/${s.slug}/`, s.naam])], ['Handige gidsen', ondLinks]],
    })
  }
  for (const s of steden) {
    const p = provVan[s.prov]
    const buren = stedenIn(s.prov).filter((b) => b.slug !== s.slug)
    pag.push({
      pad: `offerte-maken/${s.slug}/`,
      titel: `Offerte maken in ${s.naam}: badkamer, keuken en verbouwing | Maatklaar`,
      meta: `Vakman in ${s.naam}? Lees waar je op let bij woningen in ${s.naam} en maak je offerte voor badkamer, keuken of verbouwing gratis met Maatklaar.`,
      h1: `Offerte maken in ${s.naam}`,
      kruimel: [['offerte-maken/', 'Per regio'], [`offerte-maken/provincie-${p.slug}/`, p.naam], [s.naam]],
      inhoud: `<p class="lead">Badkamers, keukens, toiletten en vloeren in ${s.naam}: elke wijk heeft zijn eigen woningen en dus zijn eigen aandachtspunten. Dit is wat voor vakmensen in ${s.naam} belangrijk is bij het opstellen van een offerte.</p>
<h2>Woningen in ${s.naam}</h2><p>${s.bouw}</p>
<h2>Praktijktip voor ${s.naam}</h2><p>${s.tip}</p>
${praktijk(s)}`,
      faq: [
        [`Waar let ik op bij woningen in ${s.naam}?`, s.tip],
        ...(s.faq ? [s.faq] : []),
      ],
      links: [
        [`Meer in ${p.naam}`, [[`offerte-maken/provincie-${p.slug}/`, `Provincie ${p.naam}`], ...buren.map((b) => [`offerte-maken/${b.slug}/`, b.naam])]],
        ['Handige gidsen', ondLinks],
      ],
    })
  }
  pag.push({
    pad: 'gratis-offerte-app-badkamerrenovatie/',
    titel: 'Gratis offerte-app voor badkamerrenovatie | Maatklaar',
    meta: 'Maatklaar is een gratis offerte-app voor aannemers en vakmensen: badkamer opmeten, 2D/3D-ontwerp, materialen berekenen en akkoord via WhatsApp. Zonder creditcard, zonder installatie.',
    h1: 'Gratis offerte-app voor badkamerrenovatie',
    kruimel: [['Gratis offerte-app badkamer']],
    inhoud: `<p class="lead"><strong>Maatklaar is een gratis offerte-app voor badkamerrenovatie</strong>, gemaakt voor aannemers, tegelzetters, installateurs en klusbedrijven in Nederland. Je meet de badkamer op bij de klant, ziet hem in 2D en 3D, laat materialen en arbeid uitrekenen met je eigen tarieven en stuurt de offerte via WhatsApp of e-mail. De klant geeft digitaal akkoord.</p>
<h2>Wat je gratis krijgt</h2><ol>
<li><strong>Opmeten op locatie</strong>: wanden, vloer, ramen, deur en leidingpunten op je telefoon of tablet.</li>
<li><strong>2D-plattegrond en 3D-weergave</strong>: bad, douche, toilet en badmeubel plaatsen, zodat de klant ziet wat hij krijgt.</li>
<li><strong>Automatische berekening</strong>: tegels, lijm, voeg, kitwerk en arbeid op basis van de maten en jouw eigen tarieven.</li>
<li><strong>Offerte met schets</strong>: een nette offerte met tekening, direct vanaf de bouwplaats verstuurd.</li>
<li><strong>Akkoord via WhatsApp</strong>: de klant opent een link en tekent op zijn telefoon, zonder iets te installeren.</li>
<li><strong>Meerwerkbon en factuur</strong> vanuit dezelfde offerte.</li></ol>
<h2>Gratis, zonder creditcard</h2><p>Je begint direct in je browser. Er is geen creditcard en geen installatie nodig, en om te starten heb je zelfs geen account nodig: je gegevens blijven standaard op je eigen apparaat. Met een optioneel gratis account worden ze beveiligd opgeslagen in een datacenter in de EU.</p>
<h2>Voor wie is het?</h2><p>Voor vakmensen die badkamers, toiletten, keukens en vloeren renoveren en liever bij de klant een offerte maken dan 's avonds achter de laptop. Maatklaar is geen complete boekhouding of planningssoftware; het is gemaakt om sneller van opmeten naar akkoord te gaan.</p>
<h2>Zo werkt het in 4 stappen</h2><ol><li>Open maatklaar.nl op je telefoon.</li><li>Meet de badkamer op en plaats het sanitair.</li><li>Controleer de berekende regels en pas je tarieven aan.</li><li>Stuur de offerte via WhatsApp en ontvang het akkoord digitaal.</li></ol>
<p><strong>Probeer het gratis op maatklaar.nl</strong></p>`,
    faq: [
      ['Is Maatklaar echt gratis?', 'Ja. Je kunt gratis beginnen met opmeten, ontwerpen en offertes maken, zonder creditcard.'],
      ['Moet ik een app installeren?', 'Nee. Maatklaar werkt in de browser op je telefoon, tablet of computer.'],
      ['Kan mijn klant de offerte via WhatsApp goedkeuren?', 'Ja. Je stuurt een link via WhatsApp of e-mail en de klant tekent digitaal op zijn telefoon.'],
      ['Rekent de app tegels en materialen uit?', 'Ja. Op basis van je maten berekent Maatklaar tegels, lijm, voeg en arbeid, met je eigen tarieven.'],
      ['Waar worden mijn gegevens bewaard?', 'Standaard op je eigen apparaat. Met een gratis account beveiligd in een datacenter in de EU.'],
      ['Is Maatklaar alleen voor badkamers?', 'Nee, ook voor toiletten, keukens en vloeren, maar badkamerrenovatie is waar de app het sterkst in is.'],
    ],
    links: [['Handige gidsen', ondLinks], ['Vergelijken', [['vergelijking-offerte-apps/', 'Maatklaar vs. andere offerte-apps']]], ['Per regio', [['offerte-maken/', 'Alle provincies en steden']]]],
  })
  pag.push({
    pad: 'vergelijking-offerte-apps/', titel: 'Maatklaar vs. andere offerte-apps voor aannemers (2026) | Maatklaar',
    meta: 'Eerlijke vergelijking van offerte-apps voor vakmensen: Maatklaar, Vastlegg, Bouwportaal en Offertje. Opmeten, ontwerp, digitaal tekenen, factuur en privacy naast elkaar.',
    h1: 'Maatklaar vs. andere offerte-apps', kruimel: [['Vergelijking offerte-apps']],
    inhoud: '<p class="lead">Welke offerte-app past bij jou? Het Maatklaar-team zette vier opties eerlijk naast elkaar. Niet elke app is voor hetzelfde gemaakt: kies wat bij jouw werk past.</p><p style="font-size:.85rem;color:#7A6F66">Stand: oktober 2026, op basis van de openbare websites van de aanbieders. Klopt er iets niet meer? Laat het ons weten via de app.</p>'
      + '<div style="overflow-x:auto"><table style="border-collapse:collapse;min-width:640px;font-size:.92rem"><thead><tr><th style="text-align:left;border-bottom:2px solid #2B2623;padding:8px">Criterium</th><th style="text-align:left;border-bottom:2px solid #2B2623;padding:8px">Maatklaar</th><th style="text-align:left;border-bottom:2px solid #2B2623;padding:8px">Vastlegg</th><th style="text-align:left;border-bottom:2px solid #2B2623;padding:8px">Bouwportaal</th><th style="text-align:left;border-bottom:2px solid #2B2623;padding:8px">Offertje</th></tr></thead><tbody><tr><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top"><strong>Gemaakt voor</strong></td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Badkamer, toilet, keuken en vloer: opmeten bij de klant</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Zzp en bouwbedrijven: offerte, project, Wkb en factuur</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Bouw- en installatiebedrijven: offerte, planning, werkbon, factuur</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Iedereen die snel één losse offerte-PDF wil</td></tr><tr><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top"><strong>Opmeten en materiaal berekenen</strong></td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Ja: maten in, app rekent tegels, lijm, voeg en arbeid uit</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Nee, regels uit je eigen catalogus</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Nee, regels uit je eigen prijzenboek</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Nee, je typt zelf regels</td></tr><tr><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top"><strong>Schets of 2D/3D-ontwerp op de offerte</strong></td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Ja</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Nee</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Nee</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Nee</td></tr><tr><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top"><strong>Klant tekent digitaal</strong></td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Ja, via een link (WhatsApp of e-mail)</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Ja</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Ja</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Je zet zelf een handtekening op de PDF</td></tr><tr><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top"><strong>Werkt op de telefoon, zonder installatie</strong></td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Ja, in de browser</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Ja, in de browser</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Ja, met app</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Ja, in de browser</td></tr><tr><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top"><strong>Meerwerk en factuur</strong></td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Meerwerkbon en factuur vanuit de offerte</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Ja, plus Wkb-dossier</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Ja, plus project en werkbon</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Nee</td></tr><tr><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top"><strong>Account nodig</strong></td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Nee om te beginnen; optioneel account (opslag in de EU)</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Ja</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Ja</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Nee</td></tr><tr><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top"><strong>Kosten om te starten</strong></td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Gratis beginnen</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Proefperiode, daarna abonnement</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Proefperiode, daarna abonnement</td><td style="border-bottom:1px solid #e3d9cc;padding:8px;vertical-align:top">Gratis</td></tr></tbody></table></div>'
      + '<h2>Wanneer kies je wat?</h2><ul><li><strong>Maatklaar</strong> als je bij de klant opmeet en ter plekke een offerte met schets wilt maken voor badkamer, toilet, keuken of vloer.</li><li><strong>Vastlegg</strong> als je een complete administratie wilt met catalogus, marge, Wkb-dossier en facturen.</li><li><strong>Bouwportaal</strong> als je met meerdere mensen werkt en ook planning en werkbonnen nodig hebt.</li><li><strong>Offertje</strong> als je alleen af en toe snel een losse PDF-offerte nodig hebt.</li></ul>'
      + '<h2>Waar Maatklaar (nog) niet sterk in is</h2><p>Maatklaar is gemaakt voor kleinere klussen in en om de woning. Voor grote nieuwbouwprojecten, een uitgebreid eigen prijzenboek of een koppeling met je boekhouding zijn de andere pakketten verder.</p>',
    faq: [
      ['Wat is het verschil tussen Maatklaar en een gewone offertegenerator?', 'Een offertegenerator maakt een PDF van regels die je zelf typt. Maatklaar rekent vanuit de maten van de ruimte zelf uit hoeveel materiaal en arbeid nodig is, en zet een schets op de offerte.'],
      ['Kan mijn klant de offerte op zijn telefoon tekenen?', 'Ja. Bij Maatklaar, Vastlegg en Bouwportaal tekent de klant digitaal. Bij Maatklaar opent de klant een link, bijvoorbeeld via WhatsApp, zonder iets te installeren.'],
      ['Waar staan mijn gegevens?', 'Bij Maatklaar standaard op je eigen apparaat. Met een gratis account worden ze beveiligd opgeslagen in een datacenter in de EU.'],
      ['Is deze vergelijking objectief?', 'Deze pagina is gemaakt door het Maatklaar-team, dus we zijn niet neutraal. Daarom noemen we ook waar andere apps beter in zijn. Controleer altijd de actuele website van de aanbieder.'],
    ],
    links: [['Handige gidsen', ondLinks], ['Per regio', [['offerte-maken/', 'Alle provincies en steden']]]],
  })
  pag.push({
    pad: 'offerte-maken/', titel: 'Offerte maken: gidsen en tips per regio | Maatklaar',
    meta: 'Gidsen voor vakmensen: badkamer, keuken, tegelwerk, meerwerk en calculatie, plus lokale aandachtspunten voor alle provincies en grote steden in Nederland.',
    h1: 'Offerte maken: gidsen en tips per regio', kruimel: [['Per regio']],
    inhoud: '<p class="lead">Het Maatklaar-team verzamelt hier praktische gidsen voor vakmensen, en lokale aandachtspunten voor heel Nederland: van jaren-30 woningen in Groningen tot houten funderingen in de Zaanstreek.</p>',
    faq: [['Voor wie zijn deze gidsen?', 'Voor aannemers, tegelzetters, installateurs, keukenmonteurs en klusbedrijven die sneller en duidelijker offertes willen maken.']],
    links: [['Gidsen', [...ondLinks, ['vergelijking-offerte-apps/', 'Maatklaar vs. andere offerte-apps']]], ['Provincies', provincies.map((p) => [`offerte-maken/provincie-${p.slug}/`, p.naam])], ['Steden', [...steden].sort((a, b) => a.naam.localeCompare(b.naam, 'nl')).map((s) => [`offerte-maken/${s.slug}/`, s.naam])]],
  })
  return pag
}

function html(p, base, test) {
  const url = SITE + p.pad
  const a = (pad) => base + pad
  const kruimelLd = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Maatklaar', item: SITE }, ...p.kruimel.map((k, i) => ({ '@type': 'ListItem', position: i + 2, name: k.length === 2 ? k[1] : k[0], item: k.length === 2 ? SITE + k[0] : url }))] }
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map(([q, an]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: an } })) }
  return `<!doctype html>
<html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.titel)}</title><meta name="description" content="${esc(p.meta)}">
${test ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(p.titel)}"><meta property="og:description" content="${esc(p.meta)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}logo.png"><meta property="og:type" content="article">
<link rel="icon" type="image/svg+xml" href="${a('favicon.svg')}"><meta name="theme-color" content="#F5EFE6">
<script type="application/ld+json">${ld(faqLd)}</script>
<script type="application/ld+json">${ld(kruimelLd)}</script>
<style>body{margin:0;background:#F5EFE6;color:#2B2623;font:17px/1.6 system-ui,-apple-system,Roboto,sans-serif}a{color:#2B2623}header,main,footer{max-width:760px;margin:0 auto;padding:16px 20px}header{display:flex;justify-content:space-between;align-items:center;gap:12px}header>a:first-child{font-weight:700;text-decoration:none;font-size:1.2rem}h1{font-size:2rem;line-height:1.2}h2{font-size:1.3rem;margin-top:2rem}.lead{font-size:1.1rem}.cta{display:inline-block;background:#2B2623;color:#F5EFE6;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:600;margin:8px 8px 8px 0}.cta.licht{background:transparent;color:#2B2623;border:1px solid #2B2623}.blok{background:#fff;border-radius:16px;padding:20px;margin:28px 0}nav.kruimel{font-size:.85rem}details{border-bottom:1px solid #e3d9cc;padding:10px 0}summary{font-weight:600;cursor:pointer}ul.links{columns:2;padding-left:18px}ul.links li{padding:4px 0}footer{font-size:.85rem;color:#7A6F66;border-top:1px solid #e3d9cc;margin-top:40px}footer a{color:#7A6F66}</style>
</head><body>
<header><a href="${a('')}">Maatklaar</a><a class="cta" style="margin:0;padding:10px 16px" href="${a('#/demo')}">Bekijk de demo</a></header>
<main>
<nav class="kruimel" aria-label="Kruimelpad"><a href="${a('')}">Maatklaar</a> › ${p.kruimel.map((k) => (k.length === 2 ? `<a href="${a(k[0])}">${esc(k[1])}</a>` : esc(k[0]))).join(' › ')}</nav>
<h1>${esc(p.h1)}</h1>
${p.inhoud}
<div class="blok"><h2 style="margin-top:0">Probeer Maatklaar gratis</h2><p>Opmeten, ontwerpen in 2D en 3D, materialen berekenen en een offerte die je klant digitaal tekent. Zonder installatie, in je browser.</p><a class="cta" href="${a('#/demo')}">Bekijk de demo</a><a class="cta licht" href="${a('')}">Start gratis</a></div>
<h2>Veelgestelde vragen</h2>
${p.faq.map(([q, an]) => `<details><summary>${esc(q)}</summary><p>${esc(an)}</p></details>`).join('\n')}
${p.links.map(([kop, ls]) => `<h2>${esc(kop)}</h2><ul class="links">${ls.map(([h, t]) => `<li><a href="${a(h)}">${esc(t)}</a></li>`).join('')}</ul>`).join('\n')}
</main>
<footer><p><a href="${a('offerte-maken/')}">Alle gidsen en regio's</a> · ${onderwerpen.map((o) => `<a href="${a(o.slug + '/')}">${esc(o.kort)}</a>`).join(' · ')}</p><p>© 2026 Maatklaar · gemaakt door het Maatklaar-team · <a href="${a('#/privacy')}">Privacy</a></p></footer>
</body></html>
`
}

export function schrijfSeo(uit, base, test) {
  const pag = seoPaginas()
  for (const p of pag) {
    mkdirSync(join(uit, p.pad), { recursive: true })
    writeFileSync(join(uit, p.pad, 'index.html'), html(p, base, test))
  }
  const vandaag = new Date().toISOString().slice(0, 10)
  writeFileSync(join(uit, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['', ...pag.map((p) => p.pad), 'zo-ziet-maatklaar-eruit/'].map((pd) => `  <url><loc>${SITE}${pd}</loc><lastmod>${vandaag}</lastmod></url>`).join('\n')}\n</urlset>\n`)
  // Testsite mag niet geïndexeerd worden; live wel, met verwijzing naar de sitemap.
  writeFileSync(join(uit, 'robots.txt'), test ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`)
  return pag.length
}
