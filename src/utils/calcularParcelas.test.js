import { describe, it, expect } from 'vitest'
import { calcularParcelas } from './calcularParcelas.js'

describe('calcularParcelas', () => {
  it('divide igualmente quando não sobra centavo', () => {
    const p = calcularParcelas(300, 0, 3, '2026-07-01')
    expect(p.map(x => x.valor)).toEqual([100, 100, 100])
    expect(p.map(x => x.vencimento)).toEqual(['2026-07-01', '2026-08-01', '2026-09-01'])
    expect(p.map(x => x.numero)).toEqual([1, 2, 3])
    expect(p.every(x => x.pago === false && x.pagoEm === null)).toBe(true)
  })

  it('última parcela absorve o centavo de arredondamento', () => {
    const p = calcularParcelas(100, 0, 3, '2026-07-10')
    expect(p.map(x => x.valor)).toEqual([33.33, 33.33, 33.34])
  })

  it('desconta a entrada do saldo parcelado', () => {
    const p = calcularParcelas(300, 60, 2, '2026-07-05')
    expect(p.map(x => x.valor)).toEqual([120, 120])
  })

  it('dia 31 não escorrega: fixa no último dia de meses curtos', () => {
    const p = calcularParcelas(300, 0, 3, '2026-01-31')
    expect(p.map(x => x.vencimento)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })

  it('vira o ano corretamente', () => {
    const p = calcularParcelas(200, 0, 3, '2026-11-15')
    expect(p.map(x => x.vencimento)).toEqual(['2026-11-15', '2026-12-15', '2027-01-15'])
  })

  it('saldo <= 0 retorna vazio', () => {
    expect(calcularParcelas(100, 100, 3, '2026-07-01')).toEqual([])
    expect(calcularParcelas(100, 150, 3, '2026-07-01')).toEqual([])
  })
})
