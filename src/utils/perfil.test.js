import { describe, it, expect } from 'vitest'
import { perfilCompleto } from './perfil.js'

describe('perfilCompleto', () => {
  it('false quando profile é null', () => {
    expect(perfilCompleto(null)).toBe(false)
  })
  it('false quando nome_loja está vazio', () => {
    expect(perfilCompleto({ nome_loja: '' })).toBe(false)
    expect(perfilCompleto({ nome_loja: '   ' })).toBe(false)
  })
  it('true quando nome_loja tem conteúdo', () => {
    expect(perfilCompleto({ nome_loja: 'Iran Utilidades' })).toBe(true)
  })
})
