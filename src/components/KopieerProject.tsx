import { useState } from 'react'
import { Copy } from 'lucide-react'
import { Button, Dialog, TextField } from './ui'
import { toast } from './Toast'
import { useProjectToegang } from '../lib/billing/store'
import { bewaarProjectKopie, kopieerProject, metNieuweKlant } from '../lib/projectKopie'
import { ga } from '../lib/router'
import { ruimteLabel } from '../lib/ruimtes'
import type { Project } from '../lib/types'

export function KopieerProjectKnop({ bron, className }: { bron: Project; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="secondary" className={className} icon={<Copy className="h-3.5 w-3.5" />} onClick={() => setOpen(true)} data-testid="kopieer-project">
        Nieuwe klant
      </Button>
      {open && <KopieerProjectDialoog bron={bron} onClose={() => setOpen(false)} />}
    </>
  )
}

export function KopieerProjectDialoog({ bron, onClose }: { bron: Project; onClose: () => void }) {
  const toegang = useProjectToegang()
  const [naam, setNaam] = useState('')
  const [klant, setKlant] = useState('')
  const [adres, setAdres] = useState('')
  const slaOp = () => {
    if (!toegang.mag) {
      onClose()
      ga('/nieuw')
      return
    }
    const kopie = metNieuweKlant(kopieerProject(bron), { naam, klant, adres })
    if (!bewaarProjectKopie(bron, kopie)) {
      toast('Opslaan mislukt: opslag vol.', 'fout')
      return
    }
    toast('Project gekopieerd. Controleer maten en prijzen voordat je een offerte stuurt.')
    onClose()
    ga(`/project/${kopie.id}/bewerken`)
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title="Kopiëren naar een nieuwe klant"
      sub={`We nemen de maten, werkzaamheden en het ontwerp van ${bron.naam || ruimteLabel(bron.type).toLowerCase()} over. Klantnaam, adres, foto's, offertes, meerwerk en uren blijven leeg.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuleren
          </Button>
          <Button onClick={slaOp} data-testid="kopieer-opslaan">
            Maak kopie
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <TextField label="Projectnaam" value={naam} onChange={setNaam} placeholder={`Bijv. ${ruimteLabel(bron.type)} ${klant || 'nieuwe klant'}`} />
        <TextField label="Klant" value={klant} onChange={setKlant} placeholder="Naam opdrachtgever" autoFocus />
        <TextField label="Adres (optioneel)" value={adres} onChange={setAdres} placeholder="Straat en plaats" />
      </div>
    </Dialog>
  )
}
