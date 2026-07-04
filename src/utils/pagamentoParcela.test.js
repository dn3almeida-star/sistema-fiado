import { describe, it, expect } from 'vitest'
import { aplicarPagamentoParcela } from './pagamentoParcela.js'

const AGORA = '2026-07-03T12:00:00.000Z'

function parcelas(...vals) {
  // vals: [{numero, valor, vencimento, pago}]
  return vals.map(v => ({ pago: false, pagoEm: null, ...v }))
}

describe('aplicarPagamentoParcela', () => {
  it('valor exato: fecha a parcela, nenhuma outra muda', () => {
    const entrada = parcelas(
      { numero: 1, valor: 100, vencimento: '2026-07-01' },
      { numero: 2, valor: 100, vencimento: '2026-08-01' },
    )
    const r = aplicarPagamentoParcela(entrada, 1, 100, AGORA)
    expect(r.diferenca).toBe(0)
    expect(r.parcelaExtraCriada).toBe(false)
    expect(r.parcelas.find(p => p.numero === 1)).toEqual({
      numero: 1, valor: 100, vencimento: '2026-07-01', pago: true, pagoEm: AGORA,
    })
    expect(r.parcelas.find(p => p.numero === 2).valor).toBe(100)
  })

  it('pagou menos: diferença soma na próxima em aberto', () => {
    const entrada = parcelas(
      { numero: 1, valor: 142.33, vencimento: '2026-07-01' },
      { numero: 2, valor: 142.33, vencimento: '2026-08-01' },
      { numero: 3, valor: 142.33, vencimento: '2026-09-01' },
    )
    const r = aplicarPagamentoParcela(entrada, 1, 100, AGORA)
    expect(r.diferenca).toBe(42.33)
    expect(r.parcelas.find(p => p.numero === 1).valor).toBe(100)
    expect(r.parcelas.find(p => p.numero === 1).pago).toBe(true)
    expect(r.parcelas.find(p => p.numero === 2).valor).toBe(184.66)
    expect(r.parcelas.find(p => p.numero === 3).valor).toBe(142.33)
    expect(r.parcelaExtraCriada).toBe(false)
  })

  it('pagou mais: excedente abate da próxima em aberto', () => {
    const entrada = parcelas(
      { numero: 1, valor: 142.33, vencimento: '2026-07-01' },
      { numero: 2, valor: 142.33, vencimento: '2026-08-01' },
    )
    const r = aplicarPagamentoParcela(entrada, 1, 200, AGORA)
    expect(r.diferenca).toBe(-57.67)
    expect(r.parcelas.find(p => p.numero === 1).valor).toBe(200)
    expect(r.parcelas.find(p => p.numero === 2).valor).toBe(84.66)
  })

  it('excedente maior que a próxima parcela: trava em 0, não fica negativa', () => {
    const entrada = parcelas(
      { numero: 1, valor: 100, vencimento: '2026-07-01' },
      { numero: 2, valor: 30, vencimento: '2026-08-01' },
    )
    const r = aplicarPagamentoParcela(entrada, 1, 200, AGORA)
    expect(r.parcelas.find(p => p.numero === 2).valor).toBe(0)
  })

  it('faltou na última parcela: cria parcela extra (venc. +1 mês, valor = diferença)', () => {
    const entrada = parcelas(
      { numero: 1, valor: 142.33, vencimento: '2026-07-01' },
    )
    const r = aplicarPagamentoParcela(entrada, 1, 100, AGORA)
    expect(r.parcelaExtraCriada).toBe(true)
    expect(r.parcelas).toHaveLength(2)
    const extra = r.parcelas.find(p => p.numero === 2)
    expect(extra).toEqual({
      numero: 2, valor: 42.33, vencimento: '2026-08-01', pago: false, pagoEm: null,
    })
  })

  it('sobrou na última parcela: sem crédito, sem parcela nova', () => {
    const entrada = parcelas(
      { numero: 1, valor: 100, vencimento: '2026-07-01' },
    )
    const r = aplicarPagamentoParcela(entrada, 1, 150, AGORA)
    expect(r.parcelaExtraCriada).toBe(false)
    expect(r.parcelas).toHaveLength(1)
    expect(r.diferenca).toBe(-50)
  })

  it('pagamento fora de ordem: escolhe a próxima por número, não posicional', () => {
    const entrada = parcelas(
      { numero: 1, valor: 100, vencimento: '2026-07-01' },
      { numero: 2, valor: 100, vencimento: '2026-08-01', pago: true, pagoEm: '2026-07-05T00:00:00.000Z' },
      { numero: 3, valor: 100, vencimento: '2026-09-01' },
    )
    const r = aplicarPagamentoParcela(entrada, 1, 80, AGORA)
    expect(r.parcelas.find(p => p.numero === 2).valor).toBe(100) // já paga, não mexe
    expect(r.parcelas.find(p => p.numero === 3).valor).toBe(120) // próxima NÃO paga
  })

  it('imutabilidade: não muta o array/objetos de entrada', () => {
    const entrada = parcelas(
      { numero: 1, valor: 100, vencimento: '2026-07-01' },
      { numero: 2, valor: 100, vencimento: '2026-08-01' },
    )
    const copia = JSON.parse(JSON.stringify(entrada))
    aplicarPagamentoParcela(entrada, 1, 80, AGORA)
    expect(entrada).toEqual(copia)
  })

  it('parcela inexistente: retorna a lista original sem mudanças', () => {
    const entrada = parcelas({ numero: 1, valor: 100, vencimento: '2026-07-01' })
    const r = aplicarPagamentoParcela(entrada, 99, 50, AGORA)
    expect(r.parcelas).toEqual(entrada)
    expect(r.parcelaExtraCriada).toBe(false)
    expect(r.diferenca).toBe(0)
  })
})
