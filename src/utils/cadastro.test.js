process.env.TZ = 'America/Sao_Paulo'

import { describe, it, expect } from 'vitest'
import { validarCadastro, calcularFimTeste, DIAS_TESTE } from './cadastro.js'

const DADOS_VALIDOS = {
  nomeLoja: 'Mercearia do Zé',
  email: 'ze@exemplo.com',
  senha: 'segredo1',
  confirmarSenha: 'segredo1',
}

describe('validarCadastro', () => {
  it('aceita dados completos e válidos', () => {
    const r = validarCadastro(DADOS_VALIDOS)
    expect(r.valido).toBe(true)
    expect(r.erros).toEqual({})
  })

  it('exige nome da loja', () => {
    const r = validarCadastro({ ...DADOS_VALIDOS, nomeLoja: '   ' })
    expect(r.valido).toBe(false)
    expect(r.erros.nomeLoja).toBe('Informe o nome da sua loja')
  })

  it('exige email válido', () => {
    const r = validarCadastro({ ...DADOS_VALIDOS, email: 'sem-arroba' })
    expect(r.valido).toBe(false)
    expect(r.erros.email).toBe('Informe um email válido')
  })

  it('exige email não vazio', () => {
    const r = validarCadastro({ ...DADOS_VALIDOS, email: '' })
    expect(r.valido).toBe(false)
    expect(r.erros.email).toBe('Informe seu email')
  })

  it('exige senha com pelo menos 6 caracteres', () => {
    const r = validarCadastro({ ...DADOS_VALIDOS, senha: '12345', confirmarSenha: '12345' })
    expect(r.valido).toBe(false)
    expect(r.erros.senha).toBe('A senha precisa ter pelo menos 6 caracteres')
  })

  it('exige confirmação igual à senha', () => {
    const r = validarCadastro({ ...DADOS_VALIDOS, confirmarSenha: 'diferente' })
    expect(r.valido).toBe(false)
    expect(r.erros.confirmarSenha).toBe('As senhas não são iguais')
  })

  it('acumula erros de vários campos ao mesmo tempo', () => {
    const r = validarCadastro({ nomeLoja: '', email: '', senha: '', confirmarSenha: '' })
    expect(r.valido).toBe(false)
    expect(Object.keys(r.erros)).toEqual(
      expect.arrayContaining(['nomeLoja', 'email', 'senha']),
    )
  })

  it('não acusa confirmação quando a senha ainda é inválida e ambas estão vazias', () => {
    const r = validarCadastro({ ...DADOS_VALIDOS, senha: '', confirmarSenha: '' })
    expect(r.erros.senha).toBe('Informe uma senha')
    expect(r.erros.confirmarSenha).toBeUndefined()
  })
})

describe('calcularFimTeste', () => {
  it('soma 30 dias dentro do mesmo ano', () => {
    expect(calcularFimTeste('2026-07-11')).toBe('2026-08-10')
  })

  it('vira o mês corretamente', () => {
    expect(calcularFimTeste('2026-01-15')).toBe('2026-02-14')
  })

  it('vira o ano corretamente', () => {
    expect(calcularFimTeste('2026-12-15')).toBe('2027-01-14')
  })

  it('atravessa fevereiro em ano bissexto', () => {
    // 2028 é bissexto: 29 de janeiro + 30 dias = 28 de fevereiro
    expect(calcularFimTeste('2028-01-29')).toBe('2028-02-28')
  })

  it('aceita quantidade de dias customizada', () => {
    expect(calcularFimTeste('2026-07-11', 7)).toBe('2026-07-18')
  })

  it('exporta DIAS_TESTE = 30 (fonte única do prazo)', () => {
    expect(DIAS_TESTE).toBe(30)
  })
})
