import { describe, it, expect } from 'vitest'
import { gerarEventosTimeline } from './timelineHelpers.js'

describe('gerarEventosTimeline', () => {
  it('generates compra event from venda.criadaEm', () => {
    const vendas = [
      {
        id: 'v1',
        clienteId: 'c1',
        criadaEm: '2026-07-01T10:00:00Z',
        valorTotal: 300,
        parcelas: [
          { numero: 1, valor: 100, vencimento: '2026-08-01', pago: false, pagoEm: null, ultimaCobrancaEm: null },
          { numero: 2, valor: 100, vencimento: '2026-09-01', pago: true, pagoEm: '2026-09-05T14:30:00Z', ultimaCobrancaEm: null },
          { numero: 3, valor: 100, vencimento: '2026-10-01', pago: false, pagoEm: null, ultimaCobrancaEm: '2026-10-02T09:15:00Z' }
        ]
      }
    ]
    const eventos = gerarEventosTimeline(vendas)

    // Check compra event exists
    const compra = eventos.find(e => e.tipo === 'compra')
    expect(compra).toBeDefined()
    expect(compra.id).toBe('venda_v1')
    expect(compra.data).toBe('2026-07-01T10:00:00Z')
    expect(compra.valor).toBe(300)
    expect(compra.descricao).toMatch(/Compra: 3 parcelas/)
    expect(compra.vendaId).toBe('v1')
    expect(compra.numeroParc).toBeNull()
  })

  it('generates vencimento event from parcela.vencimento', () => {
    const vendas = [
      {
        id: 'v1',
        clienteId: 'c1',
        criadaEm: '2026-07-01T10:00:00Z',
        valorTotal: 100,
        parcelas: [
          { numero: 1, valor: 100, vencimento: '2026-08-01', pago: false, pagoEm: null, ultimaCobrancaEm: null }
        ]
      }
    ]
    const eventos = gerarEventosTimeline(vendas)

    const vencimento = eventos.find(e => e.tipo === 'vencimento')
    expect(vencimento).toBeDefined()
    expect(vencimento.data).toBe('2026-08-01')
    expect(vencimento.valor).toBe(100)
    expect(vencimento.descricao).toMatch(/Parcela 1\/1 vence/)
    expect(vencimento.numeroParc).toBe(1)
  })

  it('generates pagamento event from parcela.pagoEm', () => {
    const vendas = [
      {
        id: 'v1',
        clienteId: 'c1',
        criadaEm: '2026-07-01T10:00:00Z',
        valorTotal: 100,
        parcelas: [
          { numero: 1, valor: 100, vencimento: '2026-08-01', pago: true, pagoEm: '2026-08-05T14:30:00Z', ultimaCobrancaEm: null }
        ]
      }
    ]
    const eventos = gerarEventosTimeline(vendas)

    const pagamento = eventos.find(e => e.tipo === 'pagamento')
    expect(pagamento).toBeDefined()
    expect(pagamento.data).toBe('2026-08-05T14:30:00Z')
    expect(pagamento.valor).toBe(100)
    expect(pagamento.descricao).toMatch(/Parcela 1\/1 recebida/)
  })

  it('generates cobranca event from parcela.ultimaCobrancaEm', () => {
    const vendas = [
      {
        id: 'v1',
        clienteId: 'c1',
        criadaEm: '2026-07-01T10:00:00Z',
        valorTotal: 100,
        parcelas: [
          { numero: 1, valor: 100, vencimento: '2026-08-01', pago: false, pagoEm: null, ultimaCobrancaEm: '2026-08-02T09:15:00Z' }
        ]
      }
    ]
    const eventos = gerarEventosTimeline(vendas)

    const cobranca = eventos.find(e => e.tipo === 'cobranca')
    expect(cobranca).toBeDefined()
    expect(cobranca.data).toBe('2026-08-02T09:15:00Z')
    expect(cobranca.descricao).toMatch(/Tentativa de cobrança/)
  })

  it('skips events with null/invalid timestamps', () => {
    const vendas = [
      {
        id: 'v1',
        clienteId: 'c1',
        criadaEm: '2026-07-01T10:00:00Z',
        valorTotal: 100,
        parcelas: [
          { numero: 1, valor: 100, vencimento: null, pago: false, pagoEm: null, ultimaCobrancaEm: null }
        ]
      }
    ]
    const eventos = gerarEventosTimeline(vendas)

    // Only compra event, no vencimento event (vencimento is null)
    expect(eventos.length).toBe(1)
    expect(eventos[0].tipo).toBe('compra')
  })

  it('returns correct evento.id format', () => {
    const vendas = [
      {
        id: 'v1',
        clienteId: 'c1',
        criadaEm: '2026-07-01T10:00:00Z',
        valorTotal: 100,
        parcelas: [
          { numero: 1, valor: 100, vencimento: '2026-08-01', pago: true, pagoEm: '2026-08-05T14:30:00Z', ultimaCobrancaEm: '2026-08-02T09:15:00Z' }
        ]
      }
    ]
    const eventos = gerarEventosTimeline(vendas)

    expect(eventos.find(e => e.tipo === 'compra').id).toBe('venda_v1')
    expect(eventos.find(e => e.tipo === 'vencimento').id).toBe('parcela_v1_1_vencimento')
    expect(eventos.find(e => e.tipo === 'pagamento').id).toBe('parcela_v1_1_pagamento')
    expect(eventos.find(e => e.tipo === 'cobranca').id).toBe('parcela_v1_1_cobranca')
  })
})
