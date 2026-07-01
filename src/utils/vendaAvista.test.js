import { describe, it, expect } from 'vitest'
import { criarParcelaAvista, ehVendaAvista } from './vendaAvista.js'

describe('criarParcelaAvista', () => {
  it('cria parcela única já paga com o valor e data informados', () => {
    const p = criarParcelaAvista(300, '2026-07-01')
    expect(p.numero).toBe(1)
    expect(p.valor).toBe(300)
    expect(p.vencimento).toBe('2026-07-01')
    expect(p.pago).toBe(true)
    expect(typeof p.pagoEm).toBe('string')
    expect(p.pagoEm.length).toBeGreaterThan(0)
  })
})

describe('ehVendaAvista', () => {
  it('true: uma parcela paga, sem entrada, vencimento igual à data de criação', () => {
    const venda = {
      entrada: 0,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [
        { numero: 1, valor: 300, vencimento: '2026-07-01', pago: true, pagoEm: '2026-07-01T10:05:00Z' }
      ]
    }
    expect(ehVendaAvista(venda)).toBe(true)
  })

  it('false: mais de uma parcela', () => {
    const venda = {
      entrada: 0,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [
        { numero: 1, valor: 150, vencimento: '2026-07-01', pago: true, pagoEm: '2026-07-01T10:05:00Z' },
        { numero: 2, valor: 150, vencimento: '2026-08-01', pago: false, pagoEm: null }
      ]
    }
    expect(ehVendaAvista(venda)).toBe(false)
  })

  it('false: parcela ainda não paga', () => {
    const venda = {
      entrada: 0,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [
        { numero: 1, valor: 300, vencimento: '2026-07-01', pago: false, pagoEm: null }
      ]
    }
    expect(ehVendaAvista(venda)).toBe(false)
  })

  it('false: teve entrada', () => {
    const venda = {
      entrada: 50,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [
        { numero: 1, valor: 250, vencimento: '2026-07-01', pago: true, pagoEm: '2026-07-01T10:05:00Z' }
      ]
    }
    expect(ehVendaAvista(venda)).toBe(false)
  })

  it('false: vencimento diferente da data de criação (fiado 1x pago depois)', () => {
    const venda = {
      entrada: 0,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [
        { numero: 1, valor: 300, vencimento: '2026-08-01', pago: true, pagoEm: '2026-08-01T10:05:00Z' }
      ]
    }
    expect(ehVendaAvista(venda)).toBe(false)
  })
})
