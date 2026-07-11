import { CheckCircle2, Circle, X, ChevronRight, Rocket } from 'lucide-react'

// Checklist dos primeiros passos, no topo do Dashboard. Guia o lojista novo até
// o momento "aha" (1ª cobrança). Some quando completo ou dispensado.
export default function CardOnboarding({ passos, navegar, onDispensar }) {
  const itens = [
    { chave: 'cadastrouCliente', label: 'Cadastre seu primeiro cliente', pagina: 'clientes' },
    { chave: 'registrouFiado', label: 'Registre um fiado (uma venda)', pagina: 'nova-venda' },
    { chave: 'enviouCobranca', label: 'Envie sua primeira cobrança', pagina: 'cobrancas' },
  ]
  const feitos = itens.filter(i => passos[i.chave]).length
  const proximo = itens.find(i => !passos[i.chave])

  return (
    <div className="bg-surface rounded-2xl shadow-sm p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Rocket size={18} className="text-primary" />
          <h2 className="font-display font-semibold text-ink">Primeiros passos</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-ink-muted tabular-nums">{feitos}/3</span>
          <button onClick={onDispensar} className="text-ink-muted hover:text-ink p-0.5" aria-label="Dispensar">
            <X size={16} />
          </button>
        </div>
      </div>

      <ul className="space-y-1">
        {itens.map(item => {
          const feito = passos[item.chave]
          const ehProximo = proximo && proximo.chave === item.chave
          return (
            <li key={item.chave}>
              <button
                onClick={() => !feito && navegar(item.pagina)}
                disabled={feito}
                className={`w-full flex items-center gap-2.5 py-2 text-left rounded-lg transition-colors ${
                  ehProximo ? 'px-2 -mx-2 bg-primary-50 active:bg-primary/10' : ''
                }`}
              >
                {feito
                  ? <CheckCircle2 size={20} className="text-success shrink-0" />
                  : <Circle size={20} className="text-ink-muted shrink-0" />}
                <span className={`flex-1 text-sm ${feito ? 'text-ink-muted line-through' : 'text-ink font-medium'}`}>
                  {item.label}
                </span>
                {ehProximo && <ChevronRight size={16} className="text-primary shrink-0" />}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
