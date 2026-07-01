export default function ModalConfirmar({ aberto, titulo, mensagem, onConfirmar, onCancelar, corConfirmar = 'danger' }) {
  if (!aberto) return null

  const coresBotao = {
    danger: 'bg-danger hover:bg-red-700 text-white',
    success: 'bg-success hover:bg-green-700 text-white',
    primary: 'bg-primary hover:bg-primary-light text-white',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancelar} />
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-ink mb-2">{titulo}</h2>
        {mensagem && <p className="text-ink-muted mb-6 text-sm leading-relaxed">{mensagem}</p>}
        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-ink-muted font-semibold hover:bg-surface-2 active:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${coresBotao[corConfirmar] || coresBotao.danger}`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
