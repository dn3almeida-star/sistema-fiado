import { formatarMoeda } from '../utils/formatadores.js'

export default function Donut({ pago, aberto }) {
  const total = pago + aberto
  const pct = total > 0 ? pago / total : 0
  const r = 42
  const circ = 2 * Math.PI * r
  const dash = circ * pct

  return (
    <div className="flex items-center gap-4">
      <svg width="110" height="110" viewBox="0 0 110 110" className="flex-shrink-0 -rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgb(var(--surface-2))" strokeWidth="12" />
        <circle
          cx="55" cy="55" r={r} fill="none" stroke="#16a34a" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
        />
      </svg>
      <div className="flex-1 space-y-1.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#16a34a' }} />
          <span className="text-ink-muted">Pago</span>
          <span className="font-ledger font-semibold text-ink ml-auto tabular-nums">{formatarMoeda(pago)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-surface-2 border border-border flex-shrink-0" />
          <span className="text-ink-muted">Em aberto</span>
          <span className="font-ledger font-semibold text-ink ml-auto tabular-nums">{formatarMoeda(aberto)}</span>
        </div>
        <p className="text-xs text-ink-muted pt-1">{Math.round(pct * 100)}% quitado</p>
      </div>
    </div>
  )
}
