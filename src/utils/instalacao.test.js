process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { decidirInstalacao } from './instalacao.js'

describe('decidirInstalacao', () => {
  it('já instalado: não oferece', () => {
    expect(decidirInstalacao({ instalado: true, dispensado: false, podeInstalar: true, ehIOS: true })).toBe(null)
  })

  it('dispensado pelo usuário: não oferece', () => {
    expect(decidirInstalacao({ instalado: false, dispensado: true, podeInstalar: true, ehIOS: false })).toBe(null)
  })

  it('Android com beforeinstallprompt disponível: modo android', () => {
    expect(decidirInstalacao({ instalado: false, dispensado: false, podeInstalar: true, ehIOS: false })).toBe('android')
  })

  it('iOS (sem prompt nativo): modo ios (instruções manuais)', () => {
    expect(decidirInstalacao({ instalado: false, dispensado: false, podeInstalar: false, ehIOS: true })).toBe('ios')
  })

  it('desktop sem suporte a instalação: não oferece', () => {
    expect(decidirInstalacao({ instalado: false, dispensado: false, podeInstalar: false, ehIOS: false })).toBe(null)
  })

  it('prompt nativo tem prioridade sobre instruções de iOS', () => {
    expect(decidirInstalacao({ instalado: false, dispensado: false, podeInstalar: true, ehIOS: true })).toBe('android')
  })
})
