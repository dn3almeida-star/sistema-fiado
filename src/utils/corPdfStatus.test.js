import { describe, it, expect } from 'vitest'
import { corPdfStatusParcela } from './corPdfStatus.js'

function diasAPartirDeHoje(dias) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

describe('corPdfStatusParcela', () => {
  it('parcela paga: verde', () => {
    const parcela = { pago: true, vencimento: diasAPartirDeHoje(-10) }
    const r = corPdfStatusParcela(parcela)
    expect(r.label).toBe('Pago')
    expect(r.bg).toEqual([220, 252, 231])
    expect(r.texto).toEqual([21, 128, 61])
  })

  it('parcela atrasada: vermelho', () => {
    const parcela = { pago: false, vencimento: diasAPartirDeHoje(-3) }
    const r = corPdfStatusParcela(parcela)
    expect(r.label).toBe('3d atraso')
    expect(r.bg).toEqual([254, 226, 226])
    expect(r.texto).toEqual([185, 28, 28])
  })

  it('parcela vence hoje: laranja', () => {
    const parcela = { pago: false, vencimento: diasAPartirDeHoje(0) }
    const r = corPdfStatusParcela(parcela)
    expect(r.label).toBe('Vence hoje')
    expect(r.bg).toEqual([255, 237, 213])
    expect(r.texto).toEqual([194, 65, 12])
  })

  it('parcela próxima (dentro de 7 dias): amarelo', () => {
    const parcela = { pago: false, vencimento: diasAPartirDeHoje(5) }
    const r = corPdfStatusParcela(parcela)
    expect(r.label).toBe('5d')
    expect(r.bg).toEqual([254, 249, 195])
    expect(r.texto).toEqual([161, 98, 7])
  })

  it('parcela normal (mais de 7 dias): cinza', () => {
    const parcela = { pago: false, vencimento: diasAPartirDeHoje(15) }
    const r = corPdfStatusParcela(parcela)
    expect(r.label).toBe('15d')
    expect(r.bg).toEqual([243, 244, 246])
    expect(r.texto).toEqual([100, 100, 100])
  })
})
