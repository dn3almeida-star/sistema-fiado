process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { gerarBrCodePix, crc16 } from './pixBrCode.js'

// O CRC do BR Code e o CRC-16/CCITT-FALSE. Se a implementacao estiver errada,
// o banco recusa o codigo inteiro e a cliente ve "codigo invalido" — entao a
// primeira trava e o vetor canonico do algoritmo.
describe('crc16', () => {
  it('bate com o vetor canonico do CRC-16/CCITT-FALSE', () => {
    expect(crc16('123456789')).toBe('29B1')
  })

  it('sempre devolve 4 digitos hex maiusculos', () => {
    for (const entrada of ['a', 'teste', '00020126', '']) {
      expect(crc16(entrada)).toMatch(/^[0-9A-F]{4}$/)
    }
  })
})

describe('gerarBrCodePix', () => {
  const base = { chave: '62999887766', nome: 'Iram Utilidades', cidade: 'Goiânia', valor: 150 }

  it('monta os campos obrigatorios do padrao', () => {
    const code = gerarBrCodePix(base)
    expect(code.startsWith('000201')).toBe(true)      // payload format indicator
    expect(code).toContain('BR.GOV.BCB.PIX')          // GUI do arranjo
    expect(code).toContain('62999887766')             // a chave
    expect(code).toContain('5303986')                 // moeda BRL
    expect(code).toContain('5802BR')                  // pais
    expect(code).toContain('6304')                    // abertura do CRC
  })

  it('fecha com CRC valido sobre todo o payload anterior', () => {
    const code = gerarBrCodePix(base)
    const semCrc = code.slice(0, -4)
    expect(semCrc.endsWith('6304')).toBe(true)
    expect(code.slice(-4)).toBe(crc16(semCrc))
  })

  it('formata o valor com duas casas e ponto decimal', () => {
    expect(gerarBrCodePix({ ...base, valor: 150 })).toContain('5406150.00')
    expect(gerarBrCodePix({ ...base, valor: 215.5 })).toContain('5406215.50')
    expect(gerarBrCodePix({ ...base, valor: 1234.56 })).toContain('54071234.56')
    expect(gerarBrCodePix({ ...base, valor: 7.4 })).toContain('54047.40')
  })

  it('omite o valor quando nao informado', () => {
    const code = gerarBrCodePix({ ...base, valor: null })
    expect(code).not.toContain('5406')
    expect(code.slice(-4)).toBe(crc16(code.slice(0, -4)))
  })

  it('normaliza nome e cidade: sem acento e em maiusculas', () => {
    const code = gerarBrCodePix({ ...base, nome: 'Açaí & Cia', cidade: 'Goiânia' })
    expect(code).toContain('ACAI & CIA')
    expect(code).toContain('GOIANIA')
    expect(code).not.toContain('Goiânia')
  })

  it('trunca nome em 25 e cidade em 15 caracteres', () => {
    const code = gerarBrCodePix({
      ...base,
      nome: 'Loja Do Seu Ze Utilidades Domesticas E Presentes',
      cidade: 'Santa Barbara Do Oeste',
    })
    expect(code).toContain('5925LOJA DO SEU ZE UTILIDA')
    expect(code).toContain('6015SANTA BARBARA ')
  })

  it('cada campo declara o proprio tamanho (TLV)', () => {
    const code = gerarBrCodePix({ ...base, nome: 'Iram Utilidades', cidade: 'Goiania' })
    expect(code).toContain('5915IRAM UTILIDADES')  // 15 caracteres
    expect(code).toContain('6007GOIANIA')          // 7 caracteres
  })

  it('devolve null quando falta a chave', () => {
    expect(gerarBrCodePix({ ...base, chave: '' })).toBe(null)
    expect(gerarBrCodePix({ ...base, chave: null })).toBe(null)
    expect(gerarBrCodePix({ ...base, chave: '   ' })).toBe(null)
  })

  it('usa defaults quando nome ou cidade vem vazios', () => {
    const code = gerarBrCodePix({ chave: '62999887766', nome: '', cidade: '', valor: 10 })
    expect(code).toContain('5903N/A')
    expect(code).toContain('6003N/A')
    expect(code.slice(-4)).toBe(crc16(code.slice(0, -4)))
  })

  it('aceita chave de e-mail sem quebrar o tamanho declarado', () => {
    const code = gerarBrCodePix({ ...base, chave: 'iram@loja.com.br' })
    expect(code).toContain('0116iram@loja.com.br')
    expect(code.slice(-4)).toBe(crc16(code.slice(0, -4)))
  })
})
