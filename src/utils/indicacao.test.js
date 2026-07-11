process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { linkIndicacao } from './indicacao.js'

describe('linkIndicacao', () => {
  it('monta o link de cadastro com o ref do indicador', () => {
    expect(linkIndicacao('https://sistema-fiado.vercel.app', 'user-123'))
      .toBe('https://sistema-fiado.vercel.app/cadastro?ref=user-123')
  })

  it('remove barra final do origin pra não duplicar', () => {
    expect(linkIndicacao('https://app.com/', 'u1')).toBe('https://app.com/cadastro?ref=u1')
  })

  it('sem userId retorna string vazia (nada a compartilhar)', () => {
    expect(linkIndicacao('https://app.com', '')).toBe('')
    expect(linkIndicacao('https://app.com', null)).toBe('')
  })
})
