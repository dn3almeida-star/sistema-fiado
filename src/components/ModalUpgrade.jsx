import { useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { PRECO_MENSAL_LABEL } from '../utils/planos.js'

const BENEFICIOS = [
  'Cobrança pronta pra enviar no WhatsApp em 1 toque',
  'Clientes ilimitados (o Grátis para em 20)',
  'Comprovante em PDF pra mandar pro cliente',
  'Relatório do dia (quanto entrou, quem pagou)',
]

// Modal de upgrade reusado por todos os gates do paywall. O pagamento será feito
// por gateway (checkout externo) — a integração entra em spec própria; por ora o
// botão "Assinar" chama onAssinar (placeholder até o gateway estar ligado).
export default function ModalUpgrade({ aberto, onFechar, onAssinar }) {
  useEffect(() => {
    if (!aberto) return
    function onKey(e) { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto, onFechar])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div
        className="bg-surface rounded-2xl shadow-sm p-5 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-upgrade"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="titulo-upgrade" className="font-bold text-lg text-ink">
              Assine o Caderno + Cobrador
            </h3>
            <p className="text-sm text-ink-muted">
              {PRECO_MENSAL_LABEL} — menos que um lanche.
            </p>
          </div>
          <button onClick={onFechar} className="text-ink-muted hover:text-ink p-1 -mt-1" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <ul className="space-y-2">
          {BENEFICIOS.map(b => (
            <li key={b} className="flex items-start gap-2 text-sm text-ink">
              <Check size={18} className="text-primary shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <button
            onClick={onAssinar}
            className="w-full text-center px-4 py-3 rounded-xl text-sm font-semibold bg-primary text-white active:bg-primary-light min-h-touch flex items-center justify-center"
          >
            Assinar {PRECO_MENSAL_LABEL}
          </button>
          <button
            onClick={onFechar}
            className="w-full px-4 py-2 text-sm font-semibold text-ink-muted hover:text-ink"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
