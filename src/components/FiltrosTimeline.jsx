export default function FiltrosTimeline({ filtros, onChange }) {
  const tipos = [
    { key: 'compra', label: 'Compras', icon: '📦', color: 'info' },
    { key: 'pagamento', label: 'Pagamentos', icon: '✓', color: 'success' },
    { key: 'vencimento', label: 'Vencimentos', icon: '⏰', color: 'warning' },
    { key: 'cobranca', label: 'Cobranças', icon: '💬', color: 'accent' }
  ]

  function toggleFiltro(key) {
    onChange({ ...filtros, [key]: !filtros[key] })
  }

  return (
    <div className="px-4 py-3 border-b border-border bg-surface-2 space-y-2">
      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Filtrar por tipo</p>
      <div className="flex flex-wrap gap-2">
        {tipos.map(tipo => (
          <label key={tipo.key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filtros[tipo.key]}
              onChange={() => toggleFiltro(tipo.key)}
              className="w-4 h-4 rounded accent-primary"
            />
            <span className="text-sm">{tipo.icon}</span>
            <span className="text-sm text-ink">{tipo.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
