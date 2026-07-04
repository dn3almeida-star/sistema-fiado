import { describe, it, expect } from 'vitest'
import { mascaraCPF, validarCPF } from './formatadores.js'

describe('mascaraCPF', () => {
  it('formata progressivamente conforme digita', () => {
    expect(mascaraCPF('123')).toBe('123')
    expect(mascaraCPF('123456')).toBe('123.456')
    expect(mascaraCPF('123456789')).toBe('123.456.789')
    expect(mascaraCPF('12345678901')).toBe('123.456.789-01')
  })
  it('ignora caracteres não numéricos', () => {
    expect(mascaraCPF('abc123def456')).toBe('123.456')
    expect(mascaraCPF('529.982.247-25')).toBe('529.982.247-25')
  })
  it('corta em 11 dígitos', () => {
    expect(mascaraCPF('123456789012345')).toBe('123.456.789-01')
  })
  it('vazio retorna vazio', () => {
    expect(mascaraCPF('')).toBe('')
    expect(mascaraCPF(null)).toBe('')
  })
})

describe('validarCPF', () => {
  it('aceita CPF válido', () => {
    expect(validarCPF('529.982.247-25')).toBe(true)
    expect(validarCPF('52998224725')).toBe(true)
  })
  it('aceita vazio (campo opcional)', () => {
    expect(validarCPF('')).toBe(true)
    expect(validarCPF(null)).toBe(true)
    expect(validarCPF(undefined)).toBe(true)
  })
  it('rejeita dígito verificador errado', () => {
    expect(validarCPF('529.982.247-24')).toBe(false)
    expect(validarCPF('529.982.247-20')).toBe(false)
  })
  it('rejeita comprimento diferente de 11 dígitos', () => {
    expect(validarCPF('123')).toBe(false)
    expect(validarCPF('5299822472')).toBe(false)
    expect(validarCPF('529982247250')).toBe(false)
  })
  it('rejeita sequência de dígitos repetidos', () => {
    expect(validarCPF('111.111.111-11')).toBe(false)
    expect(validarCPF('000.000.000-00')).toBe(false)
    expect(validarCPF('999.999.999-99')).toBe(false)
  })
})
