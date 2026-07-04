process.env.TZ = 'America/Sao_Paulo'

import { describe, it, expect } from 'vitest'
import { rotuloUltimaCobranca } from './cobrancaSelo.js'

describe('rotuloUltimaCobranca', () => {
  const agora = '2026-07-10T15:00:00.000Z'

  it('nunca cobrado retorna null', () => {
    expect(rotuloUltimaCobranca(null, agora)).toBe(null)
    expect(rotuloUltimaCobranca(undefined, agora)).toBe(null)
  })

  it('cobrado hoje', () => {
    expect(rotuloUltimaCobranca('2026-07-10T09:00:00.000Z', agora)).toBe('Cobrado hoje')
  })

  it('cobrado ontem', () => {
    expect(rotuloUltimaCobranca('2026-07-09T09:00:00.000Z', agora)).toBe('Cobrado ontem')
  })

  it('cobrado há N dias', () => {
    expect(rotuloUltimaCobranca('2026-07-06T09:00:00.000Z', agora)).toBe('Cobrado há 4d')
  })
})
