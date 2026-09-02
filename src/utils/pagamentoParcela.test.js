import { describe, it, expect } from 'vitest'
import { aplicarPagamentoParcela, desfazerPagamentoParcela } from './pagamentoParcela.js'

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

describe('desfazerPagamentoParcela', () => {
  it('pagou o valor exato: desmarcar so limpa pago/pagoEm, nada mais muda', () => {
    const entrada = parcelas(
      { numero: 1, valor: 100, vencimento: '2026-07-01', pago: true, pagoEm: AGORA },
      { numero: 2, valor: 100, vencimento: '2026-08-01' },
    )
    const r = desfazerPagamentoParcela(entrada, 1)
    expect(r.parcelas.find(p => p.numero === 1)).toEqual({
      numero: 1, valor: 100, vencimento: '2026-07-01', pago: false, pagoEm: null,
    })
    expect(r.parcelaRemovida).toBe(false)
    expect(r.diferencaRevertida).toBe(0)
  })

  it('pagou menos (diferenca redistribuida): desmarcar volta os dois valores ao original', () => {
    const original = parcelas(
      { numero: 1, valor: 93.34, vencimento: '2026-07-01' },
      { numero: 2, valor: 93.33, vencimento: '2026-08-01' },
    )
    const pago = aplicarPagamentoParcela(original, 1, 60, AGORA)
    expect(pago.parcelas.find(p => p.numero === 2).valor).toBe(126.67)

    const r = desfazerPagamentoParcela(pago.parcelas, 1)
    expect(r.parcelas.find(p => p.numero === 1)).toEqual(original[0])
    expect(r.parcelas.find(p => p.numero === 2)).toEqual(original[1])
    expect(r.parcelaRemovida).toBe(false)
  })

  it('pagou mais (excedente abatido da proxima): desmarcar restaura os dois valores', () => {
    const original = parcelas(
      { numero: 1, valor: 142.33, vencimento: '2026-07-01' },
      { numero: 2, valor: 142.33, vencimento: '2026-08-01' },
    )
    const pago = aplicarPagamentoParcela(original, 1, 200, AGORA)
    const r = desfazerPagamentoParcela(pago.parcelas, 1)
    expect(r.parcelas.find(p => p.numero === 1)).toEqual(original[0])
    expect(r.parcelas.find(p => p.numero === 2)).toEqual(original[1])
  })

  it('faltou na ultima parcela (parcela extra criada): desmarcar remove a parcela extra', () => {
    const original = parcelas({ numero: 1, valor: 142.33, vencimento: '2026-07-01' })
    const pago = aplicarPagamentoParcela(original, 1, 100, AGORA)
    expect(pago.parcelas).toHaveLength(2)

    const r = desfazerPagamentoParcela(pago.parcelas, 1)
    expect(r.parcelas).toEqual(original)
    expect(r.parcelaRemovida).toBe(true)
    expect(r.diferencaRevertida).toBe(42.33)
  })

  it('excedente que travou em 0 (clamp): desmarcar restaura o valor exato de antes, nao soma direto a diferenca', () => {
    const original = parcelas(
      { numero: 1, valor: 100, vencimento: '2026-07-01' },
      { numero: 2, valor: 30, vencimento: '2026-08-01' },
    )
    const pago = aplicarPagamentoParcela(original, 1, 200, AGORA)
    expect(pago.parcelas.find(p => p.numero === 2).valor).toBe(0) // clampou

    const r = desfazerPagamentoParcela(pago.parcelas, 1)
    expect(r.parcelas.find(p => p.numero === 2).valor).toBe(30) // volta pro original, nao pra -57.67
  })

  it('a parcela que absorveu a diferenca ja foi paga nesse meio tempo: nao mexe nela, so reverte o alvo', () => {
    const original = parcelas(
      { numero: 1, valor: 142.33, vencimento: '2026-07-01' },
      { numero: 2, valor: 142.33, vencimento: '2026-08-01' },
    )
    const pago = aplicarPagamentoParcela(original, 1, 100, AGORA)
    const comParcela2Paga = pago.parcelas.map(p =>
      p.numero === 2 ? { ...p, pago: true, pagoEm: AGORA } : p
    )
    const r = desfazerPagamentoParcela(comParcela2Paga, 1)
    expect(r.parcelas.find(p => p.numero === 1).valor).toBe(142.33) // alvo reverte normalmente
    expect(r.parcelas.find(p => p.numero === 2).valor).toBe(184.66) // ja paga, intocada
  })

  it('sem metadado de ajuste (parcela paga por outro caminho, sem valorOriginal): so alterna pago', () => {
    const entrada = parcelas({ numero: 1, valor: 50, vencimento: '2026-07-01', pago: true, pagoEm: AGORA })
    const r = desfazerPagamentoParcela(entrada, 1)
    expect(r.parcelas.find(p => p.numero === 1).valor).toBe(50)
    expect(r.parcelas.find(p => p.numero === 1).pago).toBe(false)
  })

  it('parcela inexistente: retorna a lista original sem mudancas', () => {
    const entrada = parcelas({ numero: 1, valor: 100, vencimento: '2026-07-01' })
    const r = desfazerPagamentoParcela(entrada, 99)
    expect(r.parcelas).toEqual(entrada)
    expect(r.parcelaRemovida).toBe(false)
  })

  it('imutabilidade: nao muta o array/objetos de entrada', () => {
    const original = parcelas({ numero: 1, valor: 142.33, vencimento: '2026-07-01' })
    const pago = aplicarPagamentoParcela(original, 1, 100, AGORA)
    const copia = JSON.parse(JSON.stringify(pago.parcelas))
    desfazerPagamentoParcela(pago.parcelas, 1)
    expect(pago.parcelas).toEqual(copia)
  })
})
