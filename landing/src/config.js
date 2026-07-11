// Configuração central da landing — troque aqui, vale pra página inteira.

// Para onde vai o botão "Começar grátis" (cadastro do app):
export const URL_DO_APP = 'https://sistema-fiado.vercel.app/cadastro'

// WhatsApp de contato/vendas, formato internacional só dígitos (55 + DDD + número).
export const NUMERO_WHATSAPP = '5562993395736'

export const MENSAGEM_WHATSAPP = 'Oi! Vi o Crediário Digital e quero testar.'

export const LINK_WHATSAPP =
  `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(MENSAGEM_WHATSAPP)}`
