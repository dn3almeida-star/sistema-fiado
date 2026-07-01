import { describe, it, expect } from 'vitest'
import { gerarMensagemCobranca, linkWhatsApp } from './mensagensCobranca.js'

describe('gerarMensagemCobranca', () => {
  const cliente = { id: 'c1', nome: 'João Silva', telefone: '(11) 99999-9999' }
  const venda = { id: 'v1', numero: '001' }

  it('cobranca: parcela aberta com nome, valor e vencimento', () => {
    const parcela = { numero: 1, valor: 150, vencimento: '2026-07-15', pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, venda)
    expect(r.tipo).toBe('cobranca')
    expect(r.titulo).toBe('Cobrar')
    expect(r.mensagem).toContain('João Silva')
    expect(r.mensagem).toContain('150')
    expect(r.mensagem).toContain('15/07/2026')
  })

  it('recebimento: parcela paga usa a data de pagamento (ISO completo)', () => {
    const parcela = { numero: 1, valor: 150, vencimento: '2026-07-15', pago: true, pagoEm: '2026-07-10T12:00:00.000Z' }
    const r = gerarMensagemCobranca(parcela, cliente, venda)
    expect(r.tipo).toBe('recebimento')
    expect(r.titulo).toBe('Confirmar Recebimento')
    expect(r.mensagem).toContain('João Silva')
    expect(r.mensagem).toContain('150')
    expect(r.mensagem).toContain('10/07/2026')
  })

  it('cobranca: inclui referência do pedido quando a venda tem numero', () => {
    const parcela = { numero: 2, valor: 200, vencimento: '2026-08-01', pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, venda)
    expect(r.mensagem).toContain('001')
  })

  it('cobranca: sem venda, funciona e não menciona pedido', () => {
    const parcela = { numero: 1, valor: 100, vencimento: '2026-08-01', pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, null)
    expect(r.tipo).toBe('cobranca')
    expect(r.mensagem).toContain('João Silva')
    expect(r.mensagem).not.toContain('Pedido')
  })
})

describe('linkWhatsApp', () => {
  it('monta wa.me com prefixo 55 e telefone só com dígitos', () => {
    const url = linkWhatsApp('(11) 99999-9999', 'oi')
    expect(url).toBe('https://wa.me/5511999999999?text=oi')
  })
  it('codifica a mensagem (espaços e acentos)', () => {
    const url = linkWhatsApp('11999999999', 'olá mundo')
    expect(url).toContain('https://wa.me/5511999999999?text=')
    expect(url).toContain('ol%C3%A1%20mundo')
  })
})
