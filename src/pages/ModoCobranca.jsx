import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, SkipForward, MessageCircle, PartyPopper, Lock, Copy } from 'lucide-react'
import { construirFilaCobranca } from '../utils/filaCobranca.js'
import { gerarMensagemCobranca, linkWhatsApp } from '../utils/mensagensCobranca.js'
import { statusParcela, hoje } from '../utils/formatadores.js'
import { rotuloUltimaCobranca } from '../utils/cobrancaSelo.js'

function BotaoVoltar({ navegar }) {
  return (
    <button onClick={() => navegar('cobrancas')} className="flex items-center gap-1 text-ink-muted text-sm font-medium mb-2 -ml-1">
      <ArrowLeft size={18} /> Cobranças
    </button>
  )
}

export default function ModoCobranca({ clientes, vendas, navegar, registrarCobranca, mostrarToast, profile, planoStatus, abrirUpgrade }) {
  const [fila] = useState(() => construirFilaCobranca(vendas, clientes, hoje(), new Date().toISOString()))
  const [indice, setIndice] = useState(0)
  const [enviados, setEnviados] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState(() =>
    fila[0] ? gerarMensagemCobranca(fila[0].parcela, fila[0].cliente, fila[0].venda, profile).mensagem : ''
  )

  const item = fila[indice]

  // Blindagem: cobrança em lote é do plano pago (o botão de entrada já é gateado).
  if (!planoStatus?.entitlements?.cobranca) {
    return (
      <div className="p-4 pb-6">
        <BotaoVoltar navegar={navegar} />
        <div className="text-center py-16">
          <Lock size={40} className="mx-auto mb-3 text-primary opacity-70" />
          <p className="font-semibold text-ink">Cobrança é do plano pago</p>
          <p className="text-sm text-ink-muted mt-1 max-w-xs mx-auto">
            Assine o Caderno + Cobrador pra enviar cobranças no WhatsApp em 1 toque.
          </p>
          <button
            onClick={abrirUpgrade}
            className="mt-6 bg-primary text-white px-6 py-3 rounded-xl font-semibold active:bg-primary-light transition-colors"
          >
            Assinar
          </button>
        </div>
      </div>
    )
  }

  function avancar(proximo) {
    if (proximo < fila.length) {
      const it = fila[proximo]
      setMensagem(gerarMensagemCobranca(it.parcela, it.cliente, it.venda, profile).mensagem)
    }
    setIndice(proximo)
  }

  async function enviar() {
    if (enviando || !item) return
    setEnviando(true)
    try {
      await registrarCobranca(item.venda.id, item.parcela.numero)
      window.open(linkWhatsApp(item.cliente.telefone, mensagem), '_blank', 'noopener,noreferrer')
      setEnviados(n => n + 1)
      avancar(indice + 1)
    } catch {
      mostrarToast('Erro ao registrar cobrança. Tente de novo.', 'error')
    } finally {
      setEnviando(false)
    }
  }

  // Botao proprio em vez de um passo apos o envio: voltando do WhatsApp o PWA
  // recarrega e o passo pendente se perderia.
  function enviarSoOPix() {
    const { codigoPix } = gerarMensagemCobranca(item.parcela, item.cliente, item.venda, profile)
    if (codigoPix) window.open(linkWhatsApp(item.cliente.telefone, codigoPix), '_blank', 'noopener,noreferrer')
  }

  if (fila.length === 0) {
    return (
      <div className="p-4 pb-6">
        <BotaoVoltar navegar={navegar} />
        <div className="text-center py-16">
          <PartyPopper size={40} className="mx-auto mb-3 text-brand opacity-70" />
          <p className="font-semibold text-ink">Nenhuma cobrança para hoje</p>
          <p className="text-sm text-ink-muted mt-1">Nada atrasado ou vencendo hoje.</p>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="p-4 pb-6">
        <BotaoVoltar navegar={navegar} />
        <div className="text-center py-16">
          <PartyPopper size={40} className="mx-auto mb-3 text-brand" />
          <p className="text-lg font-display font-semibold text-ink">Pronto!</p>
          <p className="text-sm text-ink-muted mt-1">
            Você cobrou <strong className="font-mono">{enviados}</strong> de <strong className="font-mono">{fila.length}</strong> hoje.
          </p>
          <button
            onClick={() => navegar('cobrancas')}
            className="mt-6 bg-primary text-white px-6 py-3 rounded-xl font-semibold active:bg-primary-light transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    )
  }

  const st = statusParcela(item.parcela)
  const selo = rotuloUltimaCobranca(item.parcela.ultimaCobrancaEm, new Date().toISOString())

  return (
    <div className="p-4 pb-6 space-y-4">
      <BotaoVoltar navegar={navegar} />

      <div>
        <div className="flex justify-between items-baseline mb-1">
          <h1 className="text-xl font-display font-semibold text-ink">Cobrança do dia</h1>
          <span className="text-sm font-mono text-ink-muted tabular-nums">{indice + 1}/{fila.length}</span>
        </div>
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(indice / fila.length) * 100}%` }} />
        </div>
      </div>

      <motion.div key={indice} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-surface rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
            <span className="font-display font-semibold text-ink-muted text-base">{item.cliente.nome[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink">{item.cliente.nome}</p>
            {item.cliente.bairro && <p className="text-xs font-mono text-ink-muted">{item.cliente.bairro}</p>}
          </div>
          <div className="text-right flex-shrink-0 font-mono">
            <div className="flex items-baseline gap-0.5 justify-end">
              <span className="text-accent text-xs font-medium">R$</span>
              <span className="text-xl font-semibold text-ink tabular-nums">
                {item.parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-ink-muted">Parcela {item.parcela.numero}/{item.venda.parcelas.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide ${st.bg} ${st.texto}`}>
            {st.label}
          </span>
          {selo && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-medium bg-surface-2 text-ink-muted">
              {selo}
            </span>
          )}
        </div>
      </motion.div>

      <div>
        <label className="text-[11px] font-mono font-medium text-ink-muted uppercase tracking-wide">Mensagem</label>
        <textarea
          value={mensagem}
          onChange={e => setMensagem(e.target.value)}
          rows={4}
          className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-sm bg-surface-2 text-ink focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => avancar(indice + 1)}
          className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border-2 border-border text-ink-muted font-semibold active:bg-surface-2 transition-colors"
        >
          <SkipForward size={16} /> Pular
        </button>
        <button
          onClick={enviar}
          disabled={enviando}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-primary text-white font-semibold active:bg-primary-light transition-colors disabled:opacity-60"
        >
          <MessageCircle size={16} /> Enviar no WhatsApp
        </button>
      </div>

      {gerarMensagemCobranca(item.parcela, item.cliente, item.venda, profile).codigoPix && (
        <button
          onClick={enviarSoOPix}
          className="mt-3 w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border-2 border-primary text-primary font-semibold active:bg-primary-50 transition-colors"
        >
          <Copy size={16} /> Enviar so o codigo Pix
        </button>
      )}
    </div>
  )
}
