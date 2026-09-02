import { describe, it, expect } from 'vitest'
import { gerarMensagemCobranca, linkWhatsApp } from './mensagensCobranca.js'
import { gerarBrCodePix } from './pixBrCode.js'

describe('gerarMensagemCobranca', () => {
  const cliente = { id: 'c1', nome: 'João Silva', telefone: '(11) 99999-9999' }
  const venda = { id: 'v1', numero: '001' }

  function diasAPartirDeHoje(dias) {
    const d = new Date()
    d.setDate(d.getDate() + dias)
    const ano = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  it('recebimento: parcela paga usa a data de pagamento (ISO completo)', () => {
    const parcela = { numero: 1, valor: 150, vencimento: '2026-07-15', pago: true, pagoEm: '2026-07-10T12:00:00.000Z' }
    const r = gerarMensagemCobranca(parcela, cliente, venda)
    expect(r.tipo).toBe('recebimento')
    expect(r.titulo).toBe('Confirmar Recebimento')
    expect(r.mensagem).toContain('João Silva')
    expect(r.mensagem).toContain('150')
    expect(r.mensagem).toContain('10/07/2026')
  })

  it('cobranca: parcela atrasada menciona "venceu em"', () => {
    const parcela = { numero: 1, valor: 150, vencimento: diasAPartirDeHoje(-3), pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, venda)
    expect(r.tipo).toBe('cobranca')
    expect(r.titulo).toBe('Cobrar')
    expect(r.mensagem).toContain('Prezado(a) João Silva')
    expect(r.mensagem).toContain('venceu em')
  })

  it('cobranca: parcela vence hoje menciona "hoje vence"', () => {
    const parcela = { numero: 1, valor: 150, vencimento: diasAPartirDeHoje(0), pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, venda)
    expect(r.mensagem).toContain('hoje vence')
  })

  it('cobranca: parcela a vencer menciona "vence em"', () => {
    const parcela = { numero: 1, valor: 150, vencimento: diasAPartirDeHoje(10), pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, venda)
    expect(r.mensagem).toContain('vence em')
  })

  it('cobranca: sem venda, funciona e não menciona pedido', () => {
    const parcela = { numero: 1, valor: 100, vencimento: diasAPartirDeHoje(0), pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, null)
    expect(r.tipo).toBe('cobranca')
    expect(r.mensagem).toContain('João Silva')
    expect(r.mensagem).not.toContain('Pedido')
  })

  it('cobranca: sem chave pix no perfil, mensagem sai igual a de hoje', () => {
    const parcela = { numero: 1, valor: 150, vencimento: diasAPartirDeHoje(-3), pago: false, pagoEm: null }
    const semPerfil = gerarMensagemCobranca(parcela, cliente, venda)
    const perfilSemChave = gerarMensagemCobranca(parcela, cliente, venda, { nome_loja: 'Iram Utilidades' })
    expect(perfilSemChave.mensagem).toBe(semPerfil.mensagem)
    expect(perfilSemChave.codigoPix).toBe(null)
  })

  it('cobranca: com chave pix, o codigo vem SEPARADO da mensagem', () => {
    const parcela = { numero: 1, valor: 150, vencimento: diasAPartirDeHoje(-3), pago: false, pagoEm: null }
    const perfil = { nome_loja: 'Iram Utilidades', chave_pix: '62999887766', cidade: 'Goiania' }
    const r = gerarMensagemCobranca(parcela, cliente, venda, perfil)

    // a mensagem de texto NAO carrega o codigo: no WhatsApp, segurar seleciona
    // a mensagem inteira, entao a cliente copiaria o texto junto e o banco recusa
    expect(r.mensagem).not.toContain('BR.GOV.BCB.PIX')
    expect(r.mensagem).toContain('venceu em')

    // o codigo vem sozinho, pra ser enviado como segunda mensagem
    expect(r.codigoPix.startsWith('000201')).toBe(true)
    expect(r.codigoPix).toContain('5406150.00')
    expect(r.codigoPix).not.toContain('Prezado')
    expect(r.codigoPix).not.toContain(String.fromCharCode(10))
  })

  it('cobranca com pix: avisa que o codigo vem na proxima mensagem e como usar', () => {
    const parcela = { numero: 1, valor: 150, vencimento: diasAPartirDeHoje(-3), pago: false, pagoEm: null }
    const perfil = { nome_loja: 'Iram Utilidades', chave_pix: '62999887766', cidade: 'Goiania' }
    const r = gerarMensagemCobranca(parcela, cliente, venda, perfil)
    expect(r.mensagem).toContain('próxima mensagem')
    expect(r.mensagem).toContain('Copia e Cola')
    // o aviso vem depois da cobranca, nao antes
    expect(r.mensagem.indexOf('venceu em')).toBeLessThan(r.mensagem.indexOf('próxima mensagem'))
  })

  it('cobranca sem pix: nao promete mensagem que nunca vai chegar', () => {
    const parcela = { numero: 1, valor: 150, vencimento: diasAPartirDeHoje(-3), pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, venda, { nome_loja: 'Iram Utilidades' })
    expect(r.mensagem).not.toContain('próxima mensagem')
    expect(r.mensagem).not.toContain('Pix')
  })

  it('recebimento: parcela paga nao leva pix (e recibo, nao cobranca)', () => {
    const parcela = { numero: 1, valor: 150, vencimento: '2026-07-15', pago: true, pagoEm: '2026-07-10T12:00:00.000Z' }
    const perfil = { nome_loja: 'Iram Utilidades', chave_pix: '62999887766', cidade: 'Goiania' }
    const r = gerarMensagemCobranca(parcela, cliente, venda, perfil)
    expect(r.tipo).toBe('recebimento')
    expect(r.codigoPix).toBe(null)
  })

  it('cobranca: chave so com espacos e tratada como ausente', () => {
    const parcela = { numero: 1, valor: 150, vencimento: diasAPartirDeHoje(0), pago: false, pagoEm: null }
    const r = gerarMensagemCobranca(parcela, cliente, venda, { chave_pix: '   ' })
    expect(r.codigoPix).toBe(null)
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
