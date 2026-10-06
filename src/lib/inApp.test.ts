import { describe, expect, it } from 'vitest'
import { chromeIntentUrl, isAndroid, isInAppBrowser } from './inApp'

const WHATSAPP = 'Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.1'
const CHROME = 'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'

describe('in-app browser', () => {
  it('herkent WebView/WhatsApp/Facebook/Instagram, niet gewone Chrome', () => {
    expect(isInAppBrowser(WHATSAPP)).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (iPhone) [FBAN/FBIOS;FBAV/400.0]')).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 12) Instagram 300.0')).toBe(true)
    expect(isInAppBrowser(CHROME)).toBe(false)
    expect(isAndroid(WHATSAPP)).toBe(true)
  })
  it('maakt een Chrome-intent met de route als _h-parameter', () => {
    const url = chromeIntentUrl('https://mariusvanderkolk-arch.github.io/slimmer-wonen-test/#/prijzen')
    expect(url).toBe(
      'intent://mariusvanderkolk-arch.github.io/slimmer-wonen-test/?_h=%2Fprijzen#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' +
        encodeURIComponent('https://mariusvanderkolk-arch.github.io/slimmer-wonen-test/?_h=%2Fprijzen') +
        ';end',
    )
    expect(chromeIntentUrl('https://x.nl/a/')).toBe('intent://x.nl/a/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent('https://x.nl/a/') + ';end')
  })
})
