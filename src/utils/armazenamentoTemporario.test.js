process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  empacotarComPrazo,
  desempacotarComPrazo,
  salvarComPrazo,
  obterComPrazo,
  limparComPrazo,
} from './armazenamentoTemporario.js'

describe('empacotar / desempacotarComPrazo (puros)', () => {
  it('recupera os dados quando ainda dentro do prazo', () => {
    const bruto = empacotarComPrazo({ a: 1 }, 1000)
    expect(desempacotarComPrazo(bruto, 1000 + 5000, 10000)).toEqual({ a: 1 })
  })

  it('recupera exatamente no limite do prazo', () => {
    const bruto = empacotarComPrazo({ a: 1 }, 1000)
    expect(desempacotarComPrazo(bruto, 1000 + 10000, 10000)).toEqual({ a: 1 })
  })

  it('retorna null quando o prazo expirou', () => {
    const bruto = empacotarComPrazo({ a: 1 }, 1000)
    expect(desempacotarComPrazo(bruto, 1000 + 10001, 10000)).toBeNull()
  })

  it('retorna null para bruto vazio', () => {
    expect(desempacotarComPrazo(null, 5000, 10000)).toBeNull()
    expect(desempacotarComPrazo('', 5000, 10000)).toBeNull()
  })

  it('retorna null para JSON inválido', () => {
    expect(desempacotarComPrazo('{invalido', 5000, 10000)).toBeNull()
  })

  it('retorna null quando falta o carimbo de tempo', () => {
    const semCarimbo = JSON.stringify({ dados: { a: 1 } })
    expect(desempacotarComPrazo(semCarimbo, 5000, 10000)).toBeNull()
  })
})

describe('salvar / obter / limparComPrazo (via localStorage)', () => {
  let armazem

  beforeEach(() => {
    armazem = new Map()
    global.localStorage = {
      getItem: k => (armazem.has(k) ? armazem.get(k) : null),
      setItem: (k, v) => armazem.set(k, String(v)),
      removeItem: k => armazem.delete(k),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete global.localStorage
  })

  it('salva e recupera o mesmo dado dentro do prazo', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    salvarComPrazo('chave', { texto: 'oi' })
    expect(obterComPrazo('chave', 60_000)).toEqual({ texto: 'oi' })
  })

  it('não recupera depois de expirar o prazo', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    salvarComPrazo('chave', { texto: 'oi' })
    now.mockReturnValue(1_000_000 + 61_000)
    expect(obterComPrazo('chave', 60_000)).toBeNull()
  })

  it('limpa o dado salvo', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    salvarComPrazo('chave', { texto: 'oi' })
    limparComPrazo('chave')
    expect(obterComPrazo('chave', 60_000)).toBeNull()
  })
})
