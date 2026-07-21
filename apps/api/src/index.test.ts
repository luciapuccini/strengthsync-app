import { describe, expect, it } from 'vitest'

import { health } from './index'

describe('@strengthsync/api', () => {
  it('health check returns ok', () => {
    expect(health()).toEqual({ ok: true })
  })
})
