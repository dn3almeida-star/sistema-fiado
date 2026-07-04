import { useEffect } from 'react'
import { haptic } from '../utils/haptic.js'

export default function ModalConfirmar({ aberto, titulo, mensagem, onConfirmar, onCancelar, corConfirmar = 'danger' }) {
  useEffect(() => {
    if (!aberto) return
    function onKey(e) { if (e.key === 'Escape') onCancelar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto, onCancelar])

  if (!aberto) return null

  const coresBotao = {
    danger: 'bg-danger hover:bg-red-700 text-white',
    success: 'bg-success hover:bg-green-700 text-white',
    primary: 'bg-primary hover:bg-primary-light text-white',
  }

  function confirmar() {
    haptic()
    onConfirmar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancelar} />
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6" role="dialog" aria-modal="true">
        <h2 className="text-lg font-bold text-ink mb-2">{titulo}</h2>
        {mensagem && <p className="text-ink-muted mb-6 text-sm leading-relaxed">{mensagem}</p>}
        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 py-3 rounded-xl border-2 border-border text-ink-muted font-semibold hover:bg-surface-2 active:bg-surface-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${coresBotao[corConfirmar] || coresBotao.danger}`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
