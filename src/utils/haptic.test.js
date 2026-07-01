import { describe, it, expect, vi, afterEach } from 'vitest'
import { haptic } from './haptic.js'

afterEach(() => { vi.unstubAllGlobals() })

describe('haptic', () => {
  it('chama navigator.vibrate quando disponível', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    haptic(20)
    expect(vibrate).toHaveBeenCalledWith(20)
  })

  it('não lança quando vibrate não existe', () => {
    vi.stubGlobal('navigator', {})
    expect(() => haptic()).not.toThrow()
  })
})
