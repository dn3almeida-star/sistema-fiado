import { formatarData, formatarMoeda } from './formatadores.js'

export function gerarMensagemCobranca(parcela, cliente, venda) {
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
