import { describe, it, expect } from 'vitest'
import { formatarCompacto } from './formatadores.js'

describe('formatarCompacto', () => {
  it('valores abaixo de mil: inteiro sem sufixo', () => {
    expect(formatarCompacto(350)).toBe('350')
    expect(formatarCompacto(0)).toBe('0')
    expect(formatarCompacto(999)).toBe('999')
  })
  it('mil ou mais: milhares com 1 casa e sufixo k', () => {
    expect(formatarCompacto(1000)).toBe('1k')
    expect(formatarCompacto(1234)).toBe('1,2k')
    expect(formatarCompacto(12345)).toBe('12,3k')
  })
})
