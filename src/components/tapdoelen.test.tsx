import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Button, Switch } from './ui'

describe('tapdoelen op mobiel (>= 44px)', () => {
  it('kleine knop is op mobiel 44px hoog (h-11), vanaf sm compacter', () => {
    const html = renderToStaticMarkup(<Button size="sm">Ok</Button>)
    expect(html).toContain('h-11')
    expect(html).toContain('sm:h-9')
  })
  it('schakelaar heeft een vergroot tikvlak', () => {
    const html = renderToStaticMarkup(<Switch checked={false} onChange={() => {}} label="Test" />)
    expect(html).toContain('before:-inset-y-2.5')
  })
})
