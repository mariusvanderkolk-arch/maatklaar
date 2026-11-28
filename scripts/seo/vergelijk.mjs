// Eerlijke vergelijkingspagina. Alleen feiten van de openbare websites van de aanbieders, met controledatum.
// Bijwerken? Controleer de prijzen opnieuw op de sites en pas GECONTROLEERD aan.
const GECONTROLEERD = '28 november 2026'

const ja = 'Ja'
const nv = '<span class="nv">Niet vermeld</span>'
const rijen = [
  ['Prijs', 'Gratis (op dit moment, alle functies)', '€ 39, € 49 of € 59 per maand excl. btw (1, 3 of 10 gebruikers)', '€ 19,99 per maand of € 199 per jaar incl. btw', '€ 14,99 per maand incl. btw'],
  ['Proberen', 'Direct, zonder account', '14 dagen, zonder betaalgegevens', '14 dagen, zonder betaalmethode', '14 dagen, zonder betaalgegevens'],
  ['Opmeten op je telefoon', 'Ja, ook inspreken', 'Ja (opname per ruimte)', nv, nv],
  ['Plattegrond en 3D-weergave', 'Ja, 2D en 3D', nv, nv, nv],
  ['Materialen uitrekenen uit de maten', 'Ja (tegels, lijm, voeg, kit, verf, stuc)', 'Calculatie met eigen prijzen', 'Materiaalraming', 'Eigen prijzenboek'],
  ['Offerte digitaal laten tekenen', ja, ja, ja, ja],
  ['Meerwerk laten aftekenen', ja, ja, nv, ja],
  ['Aanvraagformulier voor klanten', 'Ja, via WhatsApp', 'Ja, eigen aanvraagpagina', nv, nv],
  ['Opleverrapport met handtekening', ja, 'Ja (oplevering met aftekenlijst)', nv, ja],
  ['Facturen', ja, ja, nv, ja],
  ['Koppeling met boekhouding', 'Nee', 'Moneybird', nv, 'Zie hun koppelingenpagina'],
  ['Meerdere gebruikers en rollen', 'Nee', 'Ja, vanaf € 49 per maand', nv, 'Ja, zonder meerprijs'],
]

const tabel = `<div class="tabel"><table>
<thead><tr><th></th><th>Maatklaar</th><th>Bouwo</th><th>Vakpilot</th><th>Vastlegg</th></tr></thead>
<tbody>${rijen.map(([k, ...c]) => `<tr><th scope="row">${k}</th>${c.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('\n')}</tbody>
</table></div>
<p class="klein">"Niet vermeld" betekent dat we het op ${GECONTROLEERD} niet op de openbare website van de aanbieder vonden. Het kan er wel zijn. Prijzen en functies veranderen: kijk altijd zelf op de site van de aanbieder.</p>`

export const vergelijkPagina = {
  pad: 'maatklaar-vs-alternatieven/',
  titel: 'Maatklaar vs. Bouwo, Vakpilot en Vastlegg: eerlijke vergelijking | Maatklaar',
  meta: `Offerte-app voor aannemers kiezen? Maatklaar, Bouwo, Vakpilot en Vastlegg naast elkaar: prijs, opmeten, plattegrond, digitaal tekenen, opleverrapport en aanvraagformulier. Gecontroleerd op ${GECONTROLEERD}.`,
  h1: 'Maatklaar vergeleken met Bouwo, Vakpilot en Vastlegg',
  kruimel: [['Vergelijking']],
  inhoud: `<style>.tabel{overflow-x:auto;margin:20px 0;-webkit-overflow-scrolling:touch}.tabel table{border-collapse:collapse;min-width:640px;font-size:.92rem;background:#fff;border-radius:12px}.tabel th,.tabel td{padding:10px 12px;border-bottom:1px solid #e3d9cc;text-align:left;vertical-align:top}.tabel thead th{background:#2B2623;color:#F5EFE6}.tabel tbody th{font-weight:600;min-width:150px}.nv{color:#7A6F66}.klein{font-size:.85rem;color:#7A6F66}</style>
<p class="lead">Er zijn steeds meer apps voor aannemers en vakmensen om offertes, meerwerk en facturen te maken. Ze lijken op elkaar, maar ze zijn voor verschillende bedrijven gemaakt. Hieronder staan vier Nederlandse apps naast elkaar, met alleen wat de aanbieders zelf op hun website zetten.</p>
${tabel}
<h2>Waar Maatklaar sterk in is</h2>
<ul>
<li><strong>Van opmeten naar offerte in één keer.</strong> Je meet de ruimte op, ziet hem als plattegrond en in 3D, en Maatklaar rekent tegels, lijm, voeg, kit, verf of stuc uit de maten uit. Daar komt je offerte direct uit.</li>
<li><strong>Gratis en zonder account.</strong> Je begint in je browser. Je gegevens blijven op je eigen apparaat, tenzij je zelf een gratis account maakt om ze te synchroniseren.</li>
<li><strong>Alles via WhatsApp.</strong> Offerte, meerwerkbon en factuur stuur je als link. De klant tekent op zijn telefoon. Maatklaar stuurt zelf geen berichten: je verstuurt alles vanuit je eigen WhatsApp.</li>
<li><strong>Aanvraaglink.</strong> Klanten beantwoorden de vragen die bij hun klus horen en sturen hun aanvraag via WhatsApp naar je. Met één tik maak je er een project van.</li>
<li><strong>Opleverrapport.</strong> De checklist staat al klaar met de werkzaamheden uit de offerte en getekend meerwerk. Restpunten leg je vast met een foto en een datum, en jullie tekenen allebei op je telefoon.</li>
</ul>
<h2>Wanneer een ander pakket beter past</h2>
<p>Werk je met meerdere mensen die elk hun eigen uren en taken bijhouden, of wil je dat je facturen vanzelf in je boekhouding komen? Dan passen pakketten met gebruikersrollen en een boekhoudkoppeling beter, zoals Bouwo (met Moneybird) of Vastlegg. Maatklaar heeft geen boekhoudkoppeling, geen gebruikersrollen en verstuurt geen automatische betaalherinneringen.</p>
<p>Wil je liever niet zelf rekenen en een offerte laten maken? Vakpilot biedt naast de app ook een dienst waarbij zij de offerte voor je opstellen.</p>
<h2>Zo kies je</h2>
<ol>
<li><strong>Kijk naar je eigen werk.</strong> Doe je vooral badkamers, toiletten, keukens, vloeren, stuc- of schilderwerk waarbij maten de prijs bepalen? Dan scheelt een app die uit je maten rekent veel tijd.</li>
<li><strong>Probeer het op één echte klus.</strong> Maak één offerte die je echt verstuurt. Dan merk je snel of het past.</li>
<li><strong>Let op wat je straks betaalt.</strong> Reken met het aantal mensen dat inlogt, en of de prijs inclusief of exclusief btw is.</li>
</ol>
<p class="klein">Bronnen, bekeken op ${GECONTROLEERD}: bouwo.nl (tarieven en functionaliteiten), vakpilot.nl (tarieven), vastlegg.nl (prijzen). Zie je iets dat niet klopt? Laat het weten via de hulpknop in de app, dan passen we het aan.</p>`,
  faq: [
    ['Is Maatklaar gratis?', 'Ja. Maatklaar is op dit moment gratis met alle functies. Je hebt geen account en geen betaalgegevens nodig om te beginnen.'],
    ['Wat is het verschil tussen Maatklaar en Bouwo?', 'Maatklaar begint bij het opmeten: je maakt een plattegrond en 3D-weergave en laat materialen uit de maten uitrekenen. Bouwo is gemaakt voor bouwbedrijven van 1 tot 10 man en heeft onder meer gebruikersrollen, urenregistratie, automatische betaalherinneringen en een Moneybird-koppeling. Bouwo kost € 39 tot € 59 per maand excl. btw.'],
    ['Kan ik met Maatklaar een opleverrapport maken?', 'Ja. Bij elk project staat de checklist al klaar met de werkzaamheden uit de offerte. Per onderdeel kies je In orde of Restpunt, met foto en datum. Jij en de klant tekenen op hetzelfde scherm en je maakt er een PDF van.'],
    ['Hoe werkt de aanvraaglink?', 'Bij Instellingen maak je je eigen aanvraaglink met QR-code. De klant kiest zijn soort klus, vinkt aan wat erbij hoort en stuurt het via zijn eigen WhatsApp naar jou. Maatklaar bewaart die aanvraag niet.'],
  ],
  links: [['Lees ook', [['vergelijking-offerte-apps/', 'Maatklaar vs. Bouwportaal en Offertje'], ['gratis-offerte-app/', 'Gratis offerte-app voor aannemers'], ['gratis-offerte-app-meerwerk/', 'Gratis meerwerkbon-app']]]],
}
