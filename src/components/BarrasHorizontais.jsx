import { formatarMoeda } from '../utils/formatadores.js'

export default function BarrasHorizontais({ itens, cor = '#154e30' }) {
  const max = Math.max(...itens.map(i => i.valor), 1)
  return (
    <div className="space-y-2.5">
      {itens.map((it, i) => (
        <div key={i}>
          <div className="flex justify-between items-baseline text-sm mb-1 gap-2">
            <span className="text-ink truncate">{it.label}</span>
            <span className="font-ledger font-semibold text-ink tabular-nums flex-shrink-0">{formatarMoeda(it.valor)}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(it.valor / max) * 100}%`, backgroundColor: cor }} />
          </div>
        </div>
      ))}
    </div>
  )
}
