import { formatarData, formatarMoeda, diasAteVencimento } from './formatadores.js'
import { gerarBrCodePix } from './pixBrCode.js'

export function gerarMensagemCobranca(parcela, cliente, venda, perfil) {
  const valor = formatarMoeda(parcela.valor)

  if (parcela.pago) {
    const dataRecebimento = formatarData(parcela.pagoEm)
    return {
      mensagem: `Oi ${cliente.nome}, recebemos seu pagamento de ${valor} em ${dataRecebimento}. Obrigado!`,
      tipo: 'recebimento',
      titulo: 'Confirmar Recebimento',
    }
  }

  const dataVencimento = formatarData(parcela.vencimento)
  const dias = diasAteVencimento(parcela.vencimento)
  let mensagem
  if (dias < 0) {
    mensagem = `Prezado(a) ${cliente.nome}, informamos que uma parcela de ${valor} venceu em ${dataVencimento}.`
  } else if (dias === 0) {
    mensagem = `Prezado(a) ${cliente.nome}, informamos que hoje vence uma parcela de ${valor}.`
  } else {
    mensagem = `Prezado(a) ${cliente.nome}, informamos que vence em ${dataVencimento} uma parcela de ${valor}.`
  }
  mensagem += ' Podemos regularizar o pagamento?'

  // O copia e cola so entra na cobranca (no recibo nao faz sentido) e so quando
  // a loja cadastrou a chave. Sem chave, a mensagem sai exatamente como antes.
  const brCode = gerarBrCodePix({
    chave: perfil?.chave_pix,
    nome: perfil?.nome_loja,
    cidade: perfil?.cidade,
    valor: parcela.valor,
  })
  if (brCode) {
    // Tres crases = bloco de codigo do WhatsApp: cai numa caixa monoespacada,
    // sem quebra no meio dos digitos, e a cliente copia so o bloco.
    mensagem += `

Pague por PIX Copia e Cola (o valor ja vai preenchido):
\`\`\`${brCode}\`\`\``
  }

  return { mensagem, tipo: 'cobranca', titulo: 'Cobrar' }
}

export function linkWhatsApp(telefone, mensagem) {
  const digits = (telefone || '').replace(/\D/g, '')
  return `https://wa.me/55${digits}?text=${encodeURIComponent(mensagem)}`
}
