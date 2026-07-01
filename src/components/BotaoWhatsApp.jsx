import { MessageCircle } from 'lucide-react'
import { linkWhatsApp } from '../utils/mensagensCobranca.js'

export default function BotaoWhatsApp({ telefone, mensagem, className = '' }) {
  function abrirWhatsApp() {
    window.open(linkWhatsApp(telefone, mensagem), '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      onClick={abrirWhatsApp}
      className={`flex items-center gap-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors min-h-touch ${className}`}
    >
      <MessageCircle size={18} />
      <span>WhatsApp</span>
    </button>
  )
}
