import { describe, it, expect } from 'vitest'
import { resolveInitialTheme } from './theme.js'

describe('resolveInitialTheme', () => {
  it('usa o valor salvo quando existe', () => {
    expect(resolveInitialTheme('dark', false)).toBe('dark')
    expect(resolveInitialTheme('light', true)).toBe('light')
  })

  it('cai na preferência do sistema quando não há valor salvo', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark')
    expect(resolveInitialTheme(null, false)).toBe('light')
  })

  it('ignora valores salvos inválidos', () => {
    expect(resolveInitialTheme('banana', true)).toBe('dark')
  })
})
