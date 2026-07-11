import { useState } from 'react'
import { X, Copy, Check, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { PRECO_MENSAL_LABEL } from '../utils/planos.js'

// Tela do pagamento Pix: mostra QR + copia-e-cola e o status (aguardando/aprovado).
// O poll de aprovação fica no hook useAssinatura; aqui é só apresentação.
export default function TelaPagamentoPix({ status, pagamento, onFechar, onTentarNovamente }) {
  const [copiado, setCopiado] = useState(false)

  function copiar() {
    if (!pagamento?.qr_code) return
    navigator.clipboard?.writeText(pagamento.qr_code)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-sm p-5 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-lg text-ink">Assinar por Pix</h3>
          <button onClick={onFechar} className="text-ink-muted hover:text-ink p-1 -mt-1" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {status === 'criando' && (
          <div className="py-12 text-center">
            <Loader2 size={32} className="mx-auto mb-3 text-primary animate-spin" />
            <p className="text-sm text-ink-muted">Gerando seu Pix…</p>
          </div>
        )}

        {status === 'erro' && (
          <div className="py-10 text-center">
            <AlertCircle size={32} className="mx-auto mb-3 text-danger" />
            <p className="font-semibold text-ink">Não deu pra gerar o Pix</p>
            <p className="text-sm text-ink-muted mt-1">Tente de novo em instantes.</p>
            <button onClick={onTentarNovamente} className="mt-5 bg-primary text-white px-6 py-2.5 rounded-xl font-semibold active:bg-primary-light">
              Tentar de novo
            </button>
          </div>
        )}

        {status === 'aprovado' && (
          <div className="py-12 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-success" />
            <p className="font-bold text-lg text-ink">Assinatura ativa! 🎉</p>
            <p className="text-sm text-ink-muted mt-1">Suas cobranças já estão liberadas.</p>
            <button onClick={onFechar} className="mt-5 bg-primary text-white px-6 py-2.5 rounded-xl font-semibold active:bg-primary-light">
              Começar a cobrar
            </button>
          </div>
        )}

        {status === 'aguardando' && pagamento && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted text-center">
              Pague <strong className="text-ink">{PRECO_MENSAL_LABEL.replace('/mês', '')}</strong> no app do seu banco. A liberação é automática.
            </p>

            {pagamento.qr_code_base64 && (
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${pagamento.qr_code_base64}`}
                  alt="QR Code do Pix"
                  className="w-52 h-52 rounded-xl border border-border bg-white p-2"
                />
              </div>
            )}

            <button
              onClick={copiar}
              className="w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl bg-surface-2 border border-border text-sm text-ink active:bg-surface"
            >
              <span className="font-mono truncate text-xs">{pagamento.qr_code}</span>
              {copiado
                ? <Check size={18} className="text-success shrink-0" />
                : <Copy size={18} className="text-ink-muted shrink-0" />}
            </button>
            <p className="text-xs text-ink-muted text-center -mt-1">
              {copiado ? 'Copiado!' : 'Toque para copiar o código Pix'}
            </p>

            <div className="flex items-center justify-center gap-2 text-sm text-ink-muted pt-1">
              <Loader2 size={16} className="animate-spin" />
              Aguardando pagamento…
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
