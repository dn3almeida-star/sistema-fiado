process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { deveUsarRascunhoVenda } from './rascunho.js'

describe('deveUsarRascunhoVenda', () => {
  it('não usa quando não há rascunho', () => {
    expect(deveUsarRascunhoVenda(null, 'abc')).toBe(false)
    expect(deveUsarRascunhoVenda(undefined, '')).toBe(false)
  })

  it('usa o rascunho quando nenhum cliente foi pré-selecionado', () => {
    expect(deveUsarRascunhoVenda({ clienteId: 'abc' }, '')).toBe(true)
    expect(deveUsarRascunhoVenda({ clienteId: 'abc' }, null)).toBe(true)
    expect(deveUsarRascunhoVenda({ clienteId: 'abc' }, undefined)).toBe(true)
  })

  it('usa o rascunho quando o cliente pré-selecionado é o mesmo do rascunho', () => {
    expect(deveUsarRascunhoVenda({ clienteId: 'abc' }, 'abc')).toBe(true)
  })

  it('ignora o rascunho quando o cliente pré-selecionado é outro', () => {
    expect(deveUsarRascunhoVenda({ clienteId: 'abc' }, 'xyz')).toBe(false)
  })
})
