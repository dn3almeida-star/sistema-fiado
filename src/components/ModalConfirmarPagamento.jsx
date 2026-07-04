import { useState, useEffect } from 'react'
import { haptic } from '../utils/haptic.js'
import { formatarMoeda } from '../utils/formatadores.js'

export default function ModalConfirmarPagamento({ aberto, parcela, onConfirmar, onCancelar }) {
  const [valor, setValor] = useState('')

  useEffect(() => {
    if (aberto && parcela) {
      setValor(parcela.valor.toFixed(2).replace('.', ','))
    }
  }, [aberto, parcela])

  if (!aberto || !parcela) return null

  const valorNumero = parseFloat(valor.replace(',', '.'))
  const valido = !isNaN(valorNumero) && valorNumero > 0

  function confirmar() {
    if (!valido) return
    haptic()
    onConfirmar(valorNumero)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancelar} />
      <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-display font-semibold text-ink mb-2">Confirmar Pagamento</h2>
        <p className="text-ink-muted mb-4 text-sm leading-relaxed">
          Parcela {parcela.numeroParcela} — valor combinado {formatarMoeda(parcela.valor)}
        </p>

        <label className="block mb-6">
          <span className="text-[11px] font-mono font-medium text-ink-muted uppercase tracking-wide">
            Valor recebido (R$)
          </span>
          <input
            autoFocus
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={e => setValor(e.target.value)}
            className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </label>

        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 py-3 rounded-xl border-2 border-border text-ink-muted font-semibold hover:bg-surface-2 active:bg-surface-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={!valido}
            className="flex-1 py-3 rounded-xl font-semibold transition-colors bg-success hover:bg-green-700 text-white disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
