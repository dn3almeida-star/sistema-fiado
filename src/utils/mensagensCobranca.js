import { formatarData, formatarMoeda, diasAteVencimento } from './formatadores.js'

export function gerarMensagemCobranca(parcela, cliente, venda, tom = 'educado') {
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

  if (tom === 'formal') {
    const dias = diasAteVencimento(parcela.vencimento)
    let mensagem
    if (dias < 0) {
      mensagem = `Prezado(a) ${cliente.nome}, informamos que uma parcela de ${valor} venceu em ${dataVencimento}.`
    } else if (dias === 0) {
      mensagem = `Prezado(a) ${cliente.nome}, informamos que hoje vence uma parcela de ${valor}.`
    } else {
      mensagem = `Prezado(a) ${cliente.nome}, informamos que vence em ${dataVencimento} uma parcela de ${valor}.`
    }
    if (venda?.numero) {
      mensagem += ` (Pedido #${venda.numero})`
    }
    mensagem += ' Podemos regularizar o pagamento?'
    return { mensagem, tipo: 'cobranca', titulo: 'Cobrar' }
  }

  let mensagem = `Oi ${cliente.nome}, você tem uma parcela aberta de ${valor} com vencimento em ${dataVencimento}.`
  if (venda?.numero) {
    mensagem += ` (Pedido #${venda.numero})`
  }
  mensagem += ' Pode confirmar?'
  return { mensagem, tipo: 'cobranca', titulo: 'Cobrar' }
}

export function linkWhatsApp(telefone, mensagem) {
  const digits = (telefone || '').replace(/\D/g, '')
  return `https://wa.me/55${digits}?text=${encodeURIComponent(mensagem)}`
}
