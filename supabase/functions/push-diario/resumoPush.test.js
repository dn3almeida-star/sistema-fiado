process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { montarNotificacaoPush } from './resumoPush.ts'

const HOJE = '2026-07-11'

const clientes = [
  { id: 'c1', nome: 'Carlos' },
  { id: 'c2', nome: 'Maria' },
]

const parc = (venc, extra = {}) => ({ vencimento: venc, valor: 100, pago: false, ...extra })

describe('montarNotificacaoPush', () => {
  it('retorna null quando não há nada a cobrar (tudo pago ou futuro)', () => {
    const vendas = [
      { clienteId: 'c1', parcelas: [parc('2026-08-01')] },                       // futura
      { clienteId: 'c2', parcelas: [parc('2026-07-01', { pago: true })] },        // paga
    ]
    expect(montarNotificacaoPush(vendas, clientes, HOJE)).toBe(null)
  })

  it('conta atrasadas + vencendo hoje, soma total, ignora pago/futuro/sem-cliente', () => {
    const vendas = [
      { clienteId: 'c1', parcelas: [
        parc('2026-07-01'),                        // atrasada — entra (100)
        parc('2026-07-11'),                        // hoje — entra (100)
        parc('2026-08-01'),                        // futura — fora
        parc('2026-06-20', { pago: true }),        // paga — fora
      ] },
      { clienteId: 'c2', parcelas: [parc('2026-07-05', { valor: 50 })] }, // atrasada — entra (50)
      { clienteId: 'zzz', parcelas: [parc('2026-07-01')] },               // sem cliente — fora
    ]
    const n = montarNotificacaoPush(vendas, clientes, HOJE)
    expect(n.qtd).toBe(3)
    expect(n.total).toBe(250)
    expect(n.titulo).toBe('3 cobranças hoje')
    expect(n.corpo).toContain('R$')
    expect(n.corpo).toContain('250')
  })

  it('usa singular quando é 1 cobrança', () => {
    const vendas = [{ clienteId: 'c1', parcelas: [parc('2026-07-10')] }]
    const n = montarNotificacaoPush(vendas, clientes, HOJE)
    expect(n.qtd).toBe(1)
    expect(n.titulo).toBe('1 cobrança hoje')
  })
})
