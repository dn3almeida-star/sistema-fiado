process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { montarCorpoPagamento, VALOR_ASSINATURA } from './pagamentoPix.ts'

describe('montarCorpoPagamento', () => {
  it('monta o corpo do Pix com external_reference = userId e valor padrão', () => {
    const corpo = montarCorpoPagamento({ userId: 'u1', email: 'lojista@ex.com' })
    expect(corpo.payment_method_id).toBe('pix')
    expect(corpo.transaction_amount).toBe(VALOR_ASSINATURA)
    expect(corpo.external_reference).toBe('u1')
    expect(corpo.payer).toEqual({ email: 'lojista@ex.com' })
  })

  it('inclui notification_url só quando fornecida', () => {
    expect(montarCorpoPagamento({ userId: 'u1', email: 'a@b.com' }).notification_url).toBeUndefined()
    const com = montarCorpoPagamento({ userId: 'u1', email: 'a@b.com', notificationUrl: 'https://x/webhook' })
    expect(com.notification_url).toBe('https://x/webhook')
  })

  it('aceita valor customizado', () => {
    expect(montarCorpoPagamento({ userId: 'u1', email: 'a@b.com', valor: 199 }).transaction_amount).toBe(199)
  })
})
