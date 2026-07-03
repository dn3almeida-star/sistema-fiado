import { RefreshCw } from 'lucide-react'

export default function AvisoAtualizacao() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="fixed top-4 left-4 right-4 z-50 bg-primary text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3"
      style={{ animation: 'toastSlide 0.25s ease-out' }}
    >
      <RefreshCw size={20} className="flex-shrink-0" />
      <span className="text-sm font-semibold flex-1 text-left">Nova versão disponível</span>
      <span className="text-xs font-bold uppercase tracking-wide">Atualizar</span>
    </button>
  )
}
