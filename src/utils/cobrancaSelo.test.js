process.env.TZ = 'America/Sao_Paulo'

import { describe, it, expect } from 'vitest'
import { rotuloUltimaCobranca, avisoRecobranca } from './cobrancaSelo.js'

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

describe('avisoRecobranca', () => {
  const agora = '2026-07-10T15:00:00.000Z'
  const emAberto = { numero: 1, valor: 150, pago: false, pagoEm: null }

  it('nunca cobrada: sem aviso', () => {
    expect(avisoRecobranca({ ...emAberto }, agora)).toBe(null)
  })

  it('cobrada ha 2 dias: avisa, dizendo ha quanto tempo', () => {
    const aviso = avisoRecobranca({ ...emAberto, ultimaCobrancaEm: '2026-07-08T09:00:00.000Z' }, agora)
    expect(aviso).toContain('ha 2 dias')
  })

  it('cobrada hoje: avisa', () => {
    const aviso = avisoRecobranca({ ...emAberto, ultimaCobrancaEm: '2026-07-10T09:00:00.000Z' }, agora)
    expect(aviso).toContain('hoje')
  })

  it('cobrada ontem: avisa no singular', () => {
    const aviso = avisoRecobranca({ ...emAberto, ultimaCobrancaEm: '2026-07-09T09:00:00.000Z' }, agora)
    expect(aviso).toContain('ontem')
  })

  it('cobrada ha muito tempo: sem aviso, e cobranca nova legitima', () => {
    expect(avisoRecobranca({ ...emAberto, ultimaCobrancaEm: '2026-06-01T09:00:00.000Z' }, agora)).toBe(null)
  })

  it('limite: 7 dias ainda avisa, 8 nao', () => {
    expect(avisoRecobranca({ ...emAberto, ultimaCobrancaEm: '2026-07-03T09:00:00.000Z' }, agora)).toContain('7 dias')
    expect(avisoRecobranca({ ...emAberto, ultimaCobrancaEm: '2026-07-02T09:00:00.000Z' }, agora)).toBe(null)
  })

  it('parcela ja paga: sem aviso (a mensagem e recibo, nao cobranca)', () => {
    const paga = { ...emAberto, pago: true, pagoEm: agora, ultimaCobrancaEm: '2026-07-09T09:00:00.000Z' }
    expect(avisoRecobranca(paga, agora)).toBe(null)
  })
})
