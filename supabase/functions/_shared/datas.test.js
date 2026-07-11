process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { calcularExpiracao } from './datas.ts'

describe('calcularExpiracao', () => {
  it('soma 30 dias por padrão, atravessando o mês', () => {
    expect(calcularExpiracao('2026-07-11')).toBe('2026-08-10')
  })

  it('atravessa a virada de ano', () => {
    expect(calcularExpiracao('2026-12-20')).toBe('2027-01-19')
  })

  it('aceita nº de dias customizado', () => {
    expect(calcularExpiracao('2026-07-11', 7)).toBe('2026-07-18')
  })
})
