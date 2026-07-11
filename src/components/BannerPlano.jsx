import { Clock, Lock } from 'lucide-react'

// Banner no topo do Dashboard mostrando a situação do plano. Some no plano pago.
// Em teste: contagem regressiva. Em grátis: chamada pra assinar.
export default function BannerPlano({ planoStatus, onUpgrade }) {
  if (!planoStatus) return null

  // Pago: só avisa quando a assinatura está perto de vencer (≤7 dias). Permanente
  // (diasRestantesPago null) ou com folga não mostra nada.
  if (planoStatus.estado === 'pago') {
    const d = planoStatus.diasRestantesPago
    if (d == null || d > 7) return null
    const texto = d === 0 ? 'Sua assinatura vence hoje' :
      d === 1 ? 'Sua assinatura vence amanhã' : `Sua assinatura vence em ${d} dias`
    return (
      <button
        onClick={onUpgrade}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-surface-2 border-b border-border text-left active:bg-surface"
      >
        <Clock size={16} className="text-primary shrink-0" />
        <span className="text-sm text-ink flex-1">{texto}</span>
        <span className="text-sm font-semibold text-primary shrink-0">Renovar</span>
      </button>
    )
  }

  if (planoStatus.estado === 'teste') {
    const dias = planoStatus.diasRestantesTeste
    const texto =
      dias === 0 ? 'Seu teste grátis acaba hoje' :
      dias === 1 ? 'Falta 1 dia do seu teste grátis' :
      `Faltam ${dias} dias do seu teste grátis`
    return (
      <button
        onClick={onUpgrade}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-surface-2 border-b border-border text-left active:bg-surface"
      >
        <Clock size={16} className="text-primary shrink-0" />
        <span className="text-sm text-ink flex-1">{texto}</span>
        <span className="text-sm font-semibold text-primary shrink-0">Assinar</span>
      </button>
    )
  }

  // gratis
  return (
    <button
      onClick={onUpgrade}
      className="w-full flex items-center gap-2 px-4 py-2.5 bg-surface-2 border-b border-border text-left active:bg-surface"
    >
      <Lock size={16} className="text-primary shrink-0" />
      <span className="text-sm text-ink flex-1">
        Plano Grátis — assine pra desbloquear a cobrança no WhatsApp
      </span>
      <span className="text-sm font-semibold text-primary shrink-0">Assinar</span>
    </button>
  )
}
