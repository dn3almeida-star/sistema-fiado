process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { passosOnboarding } from './onboarding.js'

describe('passosOnboarding', () => {
  it('tudo vazio: nenhum passo concluído, não completo', () => {
    const p = passosOnboarding([], [])
    expect(p).toEqual({ cadastrouCliente: false, registrouFiado: false, enviouCobranca: false, completo: false })
  })

  it('com cliente mas sem venda: só o 1º passo', () => {
    const p = passosOnboarding([{ id: 'c1' }], [])
    expect(p.cadastrouCliente).toBe(true)
    expect(p.registrouFiado).toBe(false)
    expect(p.completo).toBe(false)
  })

  it('com venda mas nenhuma parcela cobrada: 1º e 2º passos', () => {
    const vendas = [{ id: 'v1', parcelas: [{ numero: 1, ultimaCobrancaEm: null }] }]
    const p = passosOnboarding([{ id: 'c1' }], vendas)
    expect(p.registrouFiado).toBe(true)
    expect(p.enviouCobranca).toBe(false)
    expect(p.completo).toBe(false)
  })

  it('cliente + venda + parcela já cobrada: completo', () => {
    const vendas = [{ id: 'v1', parcelas: [{ numero: 1, ultimaCobrancaEm: '2026-07-10T14:00:00.000Z' }] }]
    const p = passosOnboarding([{ id: 'c1' }], vendas)
    expect(p).toEqual({ cadastrouCliente: true, registrouFiado: true, enviouCobranca: true, completo: true })
  })

  it('detecta cobrança em qualquer parcela de qualquer venda', () => {
    const vendas = [
      { id: 'v1', parcelas: [{ numero: 1, ultimaCobrancaEm: null }] },
      { id: 'v2', parcelas: [{ numero: 1, ultimaCobrancaEm: null }, { numero: 2, ultimaCobrancaEm: '2026-07-09T10:00:00Z' }] },
    ]
    expect(passosOnboarding([{ id: 'c1' }], vendas).enviouCobranca).toBe(true)
  })
})
