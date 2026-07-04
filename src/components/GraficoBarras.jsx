import { formatarCompacto } from '../utils/formatadores.js'

export default function GraficoBarras({ dados, cor = 'rgb(var(--brand-bright))', destaqueIndex = null }) {
  const max = Math.max(...dados.map(d => d.valor), 1)
  return (
    <div className="flex items-end justify-between gap-2 h-40">
      {dados.map((d, i) => {
        const alturaPct = d.valor > 0 ? Math.max((d.valor / max) * 100, 4) : 0
        const destaque = destaqueIndex === null || i === destaqueIndex
        return (
          <div key={d.mes} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
            <span className="text-[10px] font-mono font-semibold text-ink-muted tabular-nums h-3 leading-3">
              {d.valor > 0 ? formatarCompacto(d.valor) : ''}
            </span>
            <div
              className="w-full rounded-t-md"
              style={{ height: `${alturaPct}%`, backgroundColor: cor, opacity: destaque ? 1 : 0.4 }}
            />
            <span className="text-[10px] font-mono text-ink-muted">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}
