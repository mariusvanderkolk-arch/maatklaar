import { useState } from 'react'
import { Play } from 'lucide-react'

/** Video met nette poster en duidelijke afspeelknop; de video laadt pas na een tik (geen spinner, geen sprong in de opmaak). */
export function VeiligVideo() {
  const [speel, setSpeel] = useState(false)
  const base = import.meta.env.BASE_URL
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-sand-100 shadow-card ring-1 ring-sand-200">
      {speel ? (
        <video className="absolute inset-0 h-full w-full" controls autoPlay playsInline preload="auto" poster={`${base}veiligheid-poster.jpg`} aria-label="Video: Veilig en AVG bij Maatklaar">
          <source src={`${base}veiligheid.mp4`} type="video/mp4" />
          <track kind="captions" srcLang="nl" label="Nederlands" src={`${base}veiligheid.nl.vtt`} />
          Je browser kan deze video niet afspelen.
        </video>
      ) : (
        <button type="button" onClick={() => setSpeel(true)} aria-label="Speel de video Veilig en AVG af (23 seconden)" className="group absolute inset-0 h-full w-full">
          <img src={`${base}veiligheid-poster.jpg`} alt="" width={1280} height={720} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute inset-0 bg-ink/0 transition group-hover:bg-ink/5" />
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-2 rounded-full bg-ink/90 py-1.5 pr-3.5 pl-1.5 text-[0.78rem] sm:py-2 sm:pr-4 sm:pl-2 sm:text-[0.85rem] font-semibold text-paper shadow-lift ring-2 ring-paper/70 transition group-hover:scale-[1.03] sm:bottom-4 sm:left-4">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gold-500 sm:h-8 sm:w-8 text-ink">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
            Bekijk de video · 0:23
          </span>
        </button>
      )}
    </div>
  )
}
