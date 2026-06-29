import { CheckCircle, XCircle, Info } from 'lucide-react'

export default function Toast({ mensagem, tipo = 'success' }) {
  if (!mensagem) return null

  const config = {
    success: { bg: 'bg-green-600', Icone: CheckCircle },
    error: { bg: 'bg-red-600', Icone: XCircle },
    info: { bg: 'bg-blue-600', Icone: Info },
  }

  const { bg, Icone } = config[tipo] || config.success

  return (
    <div
      className={`fixed top-4 left-4 right-4 z-50 ${bg} text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3`}
      style={{ animation: 'toastSlide 0.25s ease-out' }}
    >
      <Icone size={20} className="flex-shrink-0" />
      <span className="text-sm font-medium">{mensagem}</span>
    </div>
  )
}
