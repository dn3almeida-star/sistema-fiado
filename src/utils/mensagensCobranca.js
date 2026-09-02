import { formatarData, formatarMoeda, diasAteVencimento } from './formatadores.js'
import { gerarBrCodePix } from './pixBrCode.js'

export function gerarMensagemCobranca(parcela, cliente, venda, perfil) {
  const valor = formatarMoeda(parcela.valor)

  if (parcela.pago) {
    const dataRecebimento = formatarData(parcela.pagoEm)
    return {
      mensagem: `Oi ${cliente.nome}, recebemos seu pagamento de ${valor} em ${dataRecebimento}. Obrigado!`,
      codigoPix: null,
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

  // O codigo vai SEPARADO, pra ser enviado como uma segunda mensagem contendo
  // so ele: no WhatsApp, segurar seleciona a mensagem inteira, entao junto do
  // texto a cliente copiaria "Prezado(a)..." e o banco recusaria o codigo.
  // Sem chave cadastrada vem null, e a tela nao oferece o segundo envio.
  const codigoPix = gerarBrCodePix({
    chave: perfil?.chave_pix,
    nome: perfil?.nome_loja,
    cidade: perfil?.cidade,
    valor: parcela.valor,
  })

  // Sem esse aviso a cliente recebe uma parede de numeros sem contexto e nao
  // sabe o que fazer com ela. So entra quando o codigo existe de fato.
  if (codigoPix) {
    mensagem += `

Na próxima mensagem vai o código do Pix. É só segurar em cima dele, tocar em Copiar, e colar no seu banco na opção "Pix Copia e Cola" — o valor já vai preenchido.`
  }

  return { mensagem, codigoPix, tipo: 'cobranca', titulo: 'Cobrar' }
}

export function linkWhatsApp(telefone, mensagem) {
  const digits = (telefone || '').replace(/\D/g, '')
  return `https://wa.me/55${digits}?text=${encodeURIComponent(mensagem)}`
}
