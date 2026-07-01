import { useState, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { gerarEventosTimeline } from '../utils/timelineHelpers.js'
import FiltrosTimeline from './FiltrosTimeline.jsx'
import EventoTimeline from './EventoTimeline.jsx'

export default function Timeline({ vendas, clientes }) {
  const [filtrosTipo, setFiltrosTipo] = useState({
    compra: true,
    pagamento: true,
    vencimento: true,
    cobranca: true
  })
  const [comprasExpandidas, setComprasExpandidas] = useState(new Set())

  // Gera eventos e filtra
  const eventosFiltrados = useMemo(() => {
    const todos = gerarEventosTimeline(vendas)
    return todos.filter(e => filtrosTipo[e.tipo])
  }, [vendas, filtrosTipo])

  // Agrupa por mês (YYYY-MM)
  const mesesComEventos = useMemo(() => {
    const meses = {}
    eventosFiltrados.forEach(evento => {
      const mes = evento.data.substring(0, 7) // "2026-07"
      if (!meses[mes]) meses[mes] = []
      meses[mes].push(evento)
    })
    // Sort desc (mais recente no topo)
    return Object.entries(meses)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mes, eventos]) => ({
        mes,
        label: formatarMesAno(mes),
        eventos: eventos.sort((a, b) => b.data.localeCompare(a.data))
      }))
  }, [eventosFiltrados])

  function toggleMes(mes) {
    setComprasExpandidas(prev => {
      const nova = new Set(prev)
      if (nova.has(mes)) nova.delete(mes)
      else nova.add(mes)
      return nova
    })
  }

  function toggleCompra(eventoId) {
    setComprasExpandidas(prev => {
      const nova = new Set(prev)
      if (nova.has(eventoId)) nova.delete(eventoId)
      else nova.add(eventoId)
      return nova
    })
  }

  return (
    <div className="space-y-3">
      <FiltrosTimeline filtros={filtrosTipo} onChange={setFiltrosTipo} />

      {mesesComEventos.length === 0 ? (
        <div className="p-6 text-center text-ink-muted">
          <p>Nenhum evento encontrado</p>
        </div>
      ) : (
        mesesComEventos.map(({ mes, label, eventos }) => (
          <div key={mes} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleMes(mes)}
              className="w-full px-4 py-3 bg-surface-2 hover:bg-surface transition-colors flex items-center justify-between"
            >
              <div className="text-left">
                <p className="font-semibold text-ink">{label}</p>
                <p className="text-xs text-ink-muted">{eventos.length} evento(s)</p>
              </div>
              <ChevronDown
                size={20}
                className={`text-ink-muted transition-transform ${
                  comprasExpandidas.has(mes) ? 'rotate-180' : ''
                }`}
              />
            </button>

            {comprasExpandidas.has(mes) && (
              <div className="divide-y divide-border">
                {eventos.map(evento => (
                  <EventoTimeline
                    key={evento.id}
                    evento={evento}
                    expandido={comprasExpandidas.has(evento.id)}
                    onToggle={() => toggleCompra(evento.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function formatarMesAno(mesStr) {
  // "2026-07" → "Julho 2026"
  const [year, month] = mesStr.split('-')
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  return `${meses[parseInt(month) - 1]} ${year}`
}
