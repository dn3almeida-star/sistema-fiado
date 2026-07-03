import { ChevronDown, Package, CheckCircle, Clock, MessageCircle } from 'lucide-react'
import { formatarData, formatarMoeda } from '../utils/formatadores.js'

const TIPO_CONFIG = {
  compra: { icon: Package, color: 'info', colorBg: 'bg-blue-100', colorText: 'text-blue-700', label: 'Compra' },
  pagamento: { icon: CheckCircle, color: 'success', colorBg: 'bg-green-100', colorText: 'text-green-700', label: 'Pagamento' },
  vencimento: { icon: Clock, color: 'warning', colorBg: 'bg-orange-100', colorText: 'text-orange-700', label: 'Vencimento' },
  cobranca: { icon: MessageCircle, color: 'accent', colorBg: 'bg-purple-100', colorText: 'text-purple-700', label: 'Cobrança' }
}

export default function EventoTimeline({ evento, expandido, onToggle }) {
  const config = TIPO_CONFIG[evento.tipo]
  const Icon = config.icon

  return (
    <>
      <div
        className={`flex items-start gap-3 p-3 border-l-4 hover:bg-surface-2 transition-colors ${
          evento.tipo === 'compra' ? 'cursor-pointer' : 'cursor-default'
        }`}
        style={{
          borderLeftColor: {
            compra: 'rgb(59, 130, 246)',
            pagamento: 'rgb(34, 197, 94)',
            vencimento: 'rgb(251, 146, 60)',
            cobranca: 'rgb(168, 85, 247)'
          }[evento.tipo]
        }}
        onClick={() => evento.tipo === 'compra' && onToggle()}
      >
        <div className="pt-1">
          <Icon size={18} className={config.colorText} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink-muted">{formatarData(evento.data)}</span>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${config.colorBg} ${config.colorText}`}>
              {config.label}
            </span>
          </div>
          <p className="text-sm text-ink mt-1">{evento.descricao}</p>
          <p className="font-ledger text-sm font-semibold text-ink mt-1">{formatarMoeda(evento.valor)}</p>
        </div>

        {evento.tipo === 'compra' && (
          <ChevronDown
            size={20}
            className={`text-ink-muted transition-transform ${expandido ? 'rotate-180' : ''}`}
          />
        )}
      </div>

      {evento.tipo === 'compra' && expandido && evento.venda && (
        <div className="pl-8 pr-3 py-2 bg-surface-2 border-l-4 border-l-blue-300 space-y-1">
          {evento.venda.parcelas.map((p, idx) => (
            <div key={p.numero} className="text-sm text-ink-muted">
              <span className="font-semibold">Parcela {p.numero}/{evento.venda.parcelas.length}</span>
              {' '}— {formatarMoeda(p.valor)}
              {p.vencimento && <span className="text-xs"> | Vence: {formatarData(p.vencimento)}</span>}
              {p.pago && <span className="text-xs text-success"> | Paga</span>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
