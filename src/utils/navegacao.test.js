process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { validarNavegacao } from './navegacao.js'

describe('validarNavegacao', () => {
  it('recupera o estado quando paginaAtiva é uma string', () => {
    expect(
      validarNavegacao({ paginaAtiva: 'nova-venda', clienteAtivoId: 'abc', vendaParaCliente: null })
    ).toEqual({ paginaAtiva: 'nova-venda', clienteAtivoId: 'abc', vendaParaCliente: null })
  })

  it('usa null como padrão quando clienteAtivoId ou vendaParaCliente estão ausentes', () => {
    expect(validarNavegacao({ paginaAtiva: 'clientes' })).toEqual({
      paginaAtiva: 'clientes',
      clienteAtivoId: null,
      vendaParaCliente: null,
    })
  })

  it('retorna null quando não há dados', () => {
    expect(validarNavegacao(null)).toBeNull()
    expect(validarNavegacao(undefined)).toBeNull()
  })

  it('retorna null quando paginaAtiva não é uma string', () => {
    expect(validarNavegacao({ paginaAtiva: 42 })).toBeNull()
    expect(validarNavegacao({})).toBeNull()
  })
})
