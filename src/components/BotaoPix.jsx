import { Copy } from 'lucide-react'
import { gerarMensagemCobranca, linkWhatsApp } from '../utils/mensagensCobranca.js'

// Envia o código Pix numa mensagem só dele. No WhatsApp, segurar seleciona a
// mensagem inteira — junto do texto da cobrança a cliente copiaria
// "Prezado(a)..." e o banco recusa o código.
//
// Fica ao lado do WhatsApp, e não como um passo depois do envio: saindo do PWA
// o iOS descarrega o app, então qualquer passo pendente se perderia.
export default function BotaoPix({ parcela, cliente, venda, perfil, className = '' }) {
  const { codigoPix } = gerarMensagemCobranca(parcela, cliente, venda, perfil)
  if (!codigoPix || !cliente?.telefone) return null

  return (
    <button
      onClick={() => window.open(linkWhatsApp(cliente.telefone, codigoPix), '_blank', 'noopener,noreferrer')}
      title="Enviar o código Pix numa mensagem separada"
      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border-2 border-primary text-primary active:bg-primary-50 transition-colors min-h-touch ${className}`}
    >
      <Copy size={16} />
      Pix
    </button>
  )
}
