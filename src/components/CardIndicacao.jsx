import { useState } from 'react'
import { Gift, Copy, Check, Share2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { linkIndicacao } from '../utils/indicacao.js'

// Card de indicação (gtm §4): o lojista compartilha o link; quem entra por ele
// ganha o teste, e o indicador ganha 1 mês quando o indicado assinar.
export default function CardIndicacao() {
  const { usuario } = useAuth()
  const [copiado, setCopiado] = useState(false)
  const link = linkIndicacao(window.location.origin, usuario?.id)
  if (!link) return null

  const texto = `Uso o Crediário Digital pra controlar meu fiado e já deixar a cobrança pronta no WhatsApp. Testa grátis 30 dias: ${link}`

  function copiar() {
    navigator.clipboard?.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }
  async function compartilhar() {
    if (navigator.share) { try { await navigator.share({ text: texto }) } catch { /* cancelado */ } }
    else copiar()
  }

  return (
    <div className="bg-surface rounded-2xl shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Gift size={18} className="text-primary" />
        <h2 className="font-display font-semibold text-ink">Indique e ganhe</h2>
      </div>
      <p className="text-xs text-ink-muted">
        Indique um colega lojista: ele testa 30 dias grátis e você ganha
        <strong className="text-ink"> 1 mês grátis</strong> quando ele assinar.
      </p>

      <button
        onClick={copiar}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-ink active:bg-surface"
      >
        <span className="font-mono truncate text-xs">{link}</span>
        {copiado ? <Check size={16} className="text-success shrink-0" /> : <Copy size={16} className="text-ink-muted shrink-0" />}
      </button>

      <button
        onClick={compartilhar}
        className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold active:bg-primary-light min-h-touch"
      >
        <Share2 size={16} /> Compartilhar convite
      </button>
    </div>
  )
}
