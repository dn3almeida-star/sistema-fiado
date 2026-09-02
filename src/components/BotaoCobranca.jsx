import { useState, useEffect } from 'react'
import { MessageCircle, X, AlertTriangle } from 'lucide-react'
import { gerarMensagemCobranca, linkWhatsApp } from '../utils/mensagensCobranca.js'
import { avisoRecobranca } from '../utils/cobrancaSelo.js'

export default function BotaoCobranca({ parcela, cliente, venda, perfil, onRegistrar, bloqueado = false, onUpgrade }) {
  const [aberto, setAberto] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [titulo, setTitulo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [codigoPix, setCodigoPix] = useState(null)
  const [pixEnviado, setPixEnviado] = useState(false)

  useEffect(() => {
    if (!aberto) return
    function onKey(e) { if (e.key === 'Escape') setAberto(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto])

  const semTelefone = !cliente?.telefone

  function abrir() {
    // Cobrança 1-toque é do plano pago; no grátis o clique leva ao upgrade.
    if (bloqueado) { onUpgrade?.(); return }
    if (semTelefone) return
    const g = gerarMensagemCobranca(parcela, cliente, venda, perfil)
    setMensagem(g.mensagem)
    setTitulo(g.titulo)
    setAviso(avisoRecobranca(parcela, new Date().toISOString()))
    setCodigoPix(g.codigoPix)
    setPixEnviado(false)
    setAberto(true)
  }

  async function enviar() {
    if (semTelefone || enviando) return
    setEnviando(true)
    try {
      await onRegistrar?.()
    } catch {
      // a tela mae mostra o erro; ainda assim abrimos o WhatsApp
    } finally {
      setEnviando(false)
    }
    window.open(linkWhatsApp(cliente.telefone, mensagem), '_blank', 'noopener,noreferrer')
    // Com Pix, o modal fica aberto no passo 2: o codigo precisa ir numa
    // mensagem so dele pra cliente conseguir copiar limpo.
    if (codigoPix) setPixEnviado(true)
    else setAberto(false)
  }

  function enviarPix() {
    window.open(linkWhatsApp(cliente.telefone, codigoPix), '_blank', 'noopener,noreferrer')
    setAberto(false)
  }

  return (
    <>
      <button
        onClick={abrir}
        disabled={semTelefone && !bloqueado}
        title={bloqueado ? 'Recurso do plano pago — toque para assinar' : semTelefone ? 'Número do cliente não cadastrado' : 'Enviar via WhatsApp'}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
          semTelefone && !bloqueado
            ? 'opacity-50 cursor-not-allowed text-ink-muted'
            : 'bg-primary text-white active:bg-primary-light'
        }`}
      >
        <MessageCircle size={16} />
        WhatsApp
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-sm p-4 max-w-md w-full space-y-3" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink">{titulo}</h3>
              <button onClick={() => setAberto(false)} className="text-ink-muted hover:text-ink p-1">
                <X size={20} />
              </button>
            </div>

            {pixEnviado ? (
              <>
                <div className="bg-primary-50 text-primary rounded-xl px-3 py-2.5">
                  <p className="text-sm font-semibold">Falta o codigo Pix</p>
                  <p className="text-xs mt-1 leading-relaxed">
                    Ele vai numa mensagem separada — assim {cliente.nome.split(' ')[0]} consegue
                    segurar e copiar so o codigo, sem o texto junto.
                  </p>
                </div>
                <p className="font-mono text-[10px] text-ink-muted break-all bg-surface-2 rounded-xl p-3">
                  {codigoPix}
                </p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setAberto(false)} className="px-4 py-2 text-sm font-semibold text-ink-muted hover:text-ink">
                    Agora nao
                  </button>
                  <button
                    onClick={enviarPix}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white active:bg-primary-light"
                  >
                    <MessageCircle size={16} />
                    Enviar o codigo Pix
                  </button>
                </div>
              </>
            ) : (
              <>
            {aviso && (
              <div className="flex gap-2 items-start bg-accent/10 text-accent rounded-xl px-3 py-2.5" role="status">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">{aviso}</p>
              </div>
            )}

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
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
