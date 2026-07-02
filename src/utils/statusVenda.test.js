process.env.TZ = 'America/Sao_Paulo'

import { describe, it, expect } from 'vitest'
import { statusVenda } from './statusVenda.js'

describe('statusVenda', () => {
  it('À Vista: venda à vista (1 parcela paga, sem entrada, vencimento = data de criação)', () => {
    const venda = {
      entrada: 0,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [{ numero: 1, valor: 300, vencimento: '2026-07-01', pago: true, pagoEm: '2026-07-01T10:05:00Z' }],
    }
    const r = statusVenda(venda)
    expect(r.label).toBe('À Vista')
    expect(r.classe).toContain('blue')
  })

  it('Quitada: não é à vista e todas as parcelas estão pagas', () => {
    const venda = {
      entrada: 0,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [
        { numero: 1, valor: 100, vencimento: '2026-07-01', pago: true },
        { numero: 2, valor: 100, vencimento: '2026-08-01', pago: true },
      ],
    }
    const r = statusVenda(venda)
    expect(r.label).toBe('Quitada')
    expect(r.classe).toContain('green')
  })

  it('Em aberto: tem ao menos uma parcela não paga', () => {
    const venda = {
      entrada: 0,
      criadaEm: '2026-07-01T10:00:00Z',
      parcelas: [
        { numero: 1, valor: 100, vencimento: '2026-07-01', pago: true },
        { numero: 2, valor: 100, vencimento: '2026-08-01', pago: false },
      ],
    }
    const r = statusVenda(venda)
    expect(r.label).toBe('Em aberto')
    expect(r.classe).toContain('red')
  })

  it('Defensivo: venda com parcelas vazias não quebra (retorna Em aberto)', () => {
    const r = statusVenda({ entrada: 0, parcelas: [] })
    expect(r.label).toBe('Em aberto')
  })

  it('Defensivo: venda sem campo parcelas não quebra', () => {
    const r = statusVenda({ entrada: 0 })
    expect(r.label).toBe('Em aberto')
  })
})
