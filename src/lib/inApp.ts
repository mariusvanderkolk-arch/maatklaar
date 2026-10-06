/** Herkenning van in-app browsers (WhatsApp, Facebook, Instagram) en een link om de pagina in Chrome te openen. */

const IN_APP = /\bwv\b|WhatsApp|FBAN|FBAV|FB_IAB|Instagram/i

export function isInAppBrowser(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  return IN_APP.test(ua)
}

export function isAndroid(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  return /Android/i.test(ua)
}

/**
 * Android-intent die de huidige pagina in Chrome opent. Het #-deel (de route) kan niet in een intent-URL,
 * dus dat gaat mee als ?_h=…; index.html zet het bij het openen terug.
 * Is Chrome er niet, dan opent de standaardbrowser via browser_fallback_url.
 */
export function chromeIntentUrl(href: string = typeof location !== 'undefined' ? location.href : ''): string {
  const u = new URL(href)
  const hash = u.hash
  u.hash = ''
  if (hash && hash !== '#') u.searchParams.set('_h', hash.slice(1))
  const zonderSchema = u.href.replace(/^https?:\/\//, '')
  return `intent://${zonderSchema}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(u.href)};end`
}
