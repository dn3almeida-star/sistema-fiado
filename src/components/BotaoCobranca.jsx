import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { gerarMensagemCobranca, linkWhatsApp } from '../utils/mensagensCobranca.js'

export default function BotaoCobranca({ parcela, cliente, venda, onRegistrar }) {
  const [aberto, setAberto] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [titulo, setTitulo] = useState('')
  const [enviando, setEnviando] = useState(false)

  const semTelefone = !cliente?.telefone

  function abrir() {
    if (semTelefone) return
    const g = gerarMensagemCobranca(parcela, cliente, venda)
    setMensagem(g.mensagem)
    setTitulo(g.titulo)
    setAberto(true)
  }

  async function enviar() {
    if (semTelefone) return
    setEnviando(true)
    try {
      await onRegistrar?.()
    } catch {
      // a tela mae mostra o erro; ainda assim abrimos o WhatsApp
    } finally {
      setEnviando(false)
    }
    window.open(linkWhatsApp(cliente.telefone, mensagem), '_blank', 'noopener,noreferrer')
    setAberto(false)
  }

  return (
    <>
      <button
        onClick={abrir}
        disabled={semTelefone}
        title={semTelefone ? 'Número do cliente não cadastrado' : 'Enviar via WhatsApp'}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
          semTelefone
            ? 'opacity-50 cursor-not-allowed text-ink-muted'
            : 'bg-primary text-white active:bg-primary-light'
        }`}
      >
        <MessageCircle size={16} />
        WhatsApp
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-sm p-4 max-w-md w-full space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink">{titulo}</h3>
              <button onClick={() => setAberto(false)} className="text-ink-muted hover:text-ink p-1">
                <X size={20} />
              </button>
            </div>

            <textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-surface-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Edite a mensagem aqui..."
            />

            <div className="flex gap-2 justify-end">
              <button onClick={() => setAberto(false)} className="px-4 py-2 text-sm font-semibold text-ink-muted hover:text-ink">
                Cancelar
              </button>
              <button
                onClick={enviar}
                disabled={enviando}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white active:bg-primary-light disabled:opacity-60"
              >
                <MessageCircle size={16} />
                Enviar via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
