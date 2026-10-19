/** Eenvoudige hash-router (werkt zonder serverconfiguratie, ook op GitHub Pages). */
import { useEffect, useState } from 'react'

export type Stap = 'opmeten' | 'ontwerp' | 'berekening' | 'inkoop' | 'offerte' | 'planning'

export type Route =
  | { naam: 'home' }
  | { naam: 'nieuw' }
  | { naam: 'over' }
  | { naam: 'prijzen'; terugNaar?: string }
  | { naam: 'instellingen'; sectie?: string }
  | { naam: 'offerte-bekijken'; data: string }
  | { naam: 'offerte-tekenen'; token: string }
  | { naam: 'voorwaarden' }
  | { naam: 'bewerken'; id: string }
  | { naam: 'project'; id: string; stap: Stap }
  | { naam: 'facturen' }
  | { naam: 'factuur'; id: string }
  | { naam: 'account' }
  | { naam: 'privacy' }
  | { naam: 'tarieven' }
  | { naam: 'abonnement'; preview?: string; terug?: boolean }

const STAPPEN: Stap[] = ['opmeten', 'ontwerp', 'berekening', 'inkoop', 'offerte', 'planning']

export function parse(hash: string): Route {
  const [pad, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const delen = pad.split('/').filter(Boolean)
  if (delen[0] === 'abonnement') {
    const q = new URLSearchParams(query)
    const pv = q.get('preview')
    return { naam: 'abonnement', preview: pv ? (pv === '1' ? 'gratis' : pv) : undefined, terug: q.has('terug') }
  }
  if (delen[0] === 'nieuw') return { naam: 'nieuw' }
  if (delen[0] === 'over') return { naam: 'over' }
  if (delen[0] === 'facturen') return { naam: 'facturen' }
  if (delen[0] === 'account') return { naam: 'account' }
  if (delen[0] === 'privacy') return { naam: 'privacy' }
  if (delen[0] === 'tarieven') return { naam: 'tarieven' }
  if (delen[0] === 'voorwaarden') return { naam: 'voorwaarden' }
  if (delen[0] === 'offerte-tekenen' && delen[1]) return { naam: 'offerte-tekenen', token: delen[1] }
  if (delen[0] === 'factuur' && delen[1]) return { naam: 'factuur', id: delen[1] }
  if (delen[0] === 'prijzen') return { naam: 'prijzen', terugNaar: delen[1] }
  if (delen[0] === 'instellingen') return { naam: 'instellingen', sectie: delen[1] }
  if (delen[0] === 'offerte-bekijken') return { naam: 'offerte-bekijken', data: delen.slice(1).join('/') }
  if (delen[0] === 'project' && delen[1]) {
    if (delen[2] === 'bewerken') return { naam: 'bewerken', id: delen[1] }
    const stap = STAPPEN.includes(delen[2] as Stap) ? (delen[2] as Stap) : 'opmeten'
    return { naam: 'project', id: delen[1], stap }
  }
  return { naam: 'home' }
}

export const ga = (pad: string) => {
  location.hash = pad
}

export function useRoute(): Route {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const f = () => {
      setHash(location.hash)
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return parse(hash)
}
