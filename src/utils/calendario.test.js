import { describe, it, expect } from 'vitest'
import { diasDoMes, nomeDoMes, decadaDoAno, rotuloPeriodo } from './calendario.js'

describe('diasDoMes', () => {
  it('julho de 2026 tem 31 dias, começando numa quarta (3 slots vazios antes do dia 1)', () => {
    const slots = diasDoMes(2026, 7)
    expect(slots[0]).toBe(null)
    expect(slots[1]).toBe(null)
    expect(slots[2]).toBe(null)
    expect(slots[3]).toBe(1)
    expect(slots[slots.length - 1]).toBe(31)
    expect(slots.filter(s => s !== null)).toHaveLength(31)
  })

  it('fevereiro de 2026 (não bissexto) tem 28 dias', () => {
    const slots = diasDoMes(2026, 2)
    expect(slots.filter(s => s !== null)).toHaveLength(28)
  })

  it('fevereiro de 2028 (bissexto) tem 29 dias', () => {
    const slots = diasDoMes(2028, 2)
    expect(slots.filter(s => s !== null)).toHaveLength(29)
  })

  it('dezembro (mes=12) funciona sem erro de índice', () => {
    const slots = diasDoMes(2026, 12)
    expect(slots.filter(s => s !== null)).toHaveLength(31)
  })
})

describe('nomeDoMes', () => {
  it('retorna os 12 nomes em português', () => {
    expect(nomeDoMes(1)).toBe('Janeiro')
    expect(nomeDoMes(2)).toBe('Fevereiro')
    expect(nomeDoMes(3)).toBe('Março')
    expect(nomeDoMes(4)).toBe('Abril')
    expect(nomeDoMes(5)).toBe('Maio')
    expect(nomeDoMes(6)).toBe('Junho')
    expect(nomeDoMes(7)).toBe('Julho')
    expect(nomeDoMes(8)).toBe('Agosto')
    expect(nomeDoMes(9)).toBe('Setembro')
    expect(nomeDoMes(10)).toBe('Outubro')
    expect(nomeDoMes(11)).toBe('Novembro')
    expect(nomeDoMes(12)).toBe('Dezembro')
  })
})

describe('decadaDoAno', () => {
  it('ano no meio da década', () => {
    expect(decadaDoAno(2026)).toBe(2020)
  })
  it('ano no início da década', () => {
    expect(decadaDoAno(2020)).toBe(2020)
  })
  it('ano no fim da década', () => {
    expect(decadaDoAno(2029)).toBe(2020)
  })
  it('outra década', () => {
    expect(decadaDoAno(1999)).toBe(1990)
  })
})

describe('rotuloPeriodo', () => {
  it('dia: formata DD/MM/YYYY', () => {
    expect(rotuloPeriodo('dia', '2026-07-15')).toBe('15/07/2026')
  })

  it('mes: formata "Mês de YYYY"', () => {
    expect(rotuloPeriodo('mes', '2026-07')).toBe('Julho de 2026')
  })

  it('ano: retorna o próprio valor', () => {
    expect(rotuloPeriodo('ano', '2026')).toBe('2026')
  })

  it('valor vazio retorna string vazia, em qualquer granularidade', () => {
    expect(rotuloPeriodo('dia', '')).toBe('')
    expect(rotuloPeriodo('mes', '')).toBe('')
    expect(rotuloPeriodo('ano', '')).toBe('')
  })
})
