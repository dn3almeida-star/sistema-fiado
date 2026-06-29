export default function CardResumo({ titulo, valor, sub, cor = 'primary', icone: Icone }) {
  const cores = {
    primary: { pill: 'bg-primary-50', icone: 'text-primary', valor: 'text-primary' },
    danger:  { pill: 'bg-red-50',      icone: 'text-danger',  valor: 'text-danger'  },
    success: { pill: 'bg-green-50',    icone: 'text-success', valor: 'text-success' },
    warning: { pill: 'bg-yellow-50',   icone: 'text-yellow-600', valor: 'text-yellow-600' },
  }
  const c = cores[cor] || cores.primary

  return (
    <div className="bg-white rounded-2xl shadow-sm px-4 py-3.5 flex items-center gap-4">
      {Icone && (
        <div className={`w-11 h-11 rounded-xl ${c.pill} flex items-center justify-center flex-shrink-0`}>
          <Icone size={22} className={c.icone} strokeWidth={2} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider truncate">{titulo}</p>
        <p className={`text-2xl font-bold ${c.valor} leading-tight tabular-nums`}>{valor}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
