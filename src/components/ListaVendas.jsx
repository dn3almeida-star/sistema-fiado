import { useState, useMemo } from 'react'
import { Search, ChevronRight, ShoppingBag } from 'lucide-react'
import { formatarMoeda, formatarData } from '../utils/formatadores.js'
import { statusVenda } from '../utils/statusVenda.js'

export default function ListaVendas({ vendas, clientes, navegar }) {
  const [busca, setBusca] = useState('')

  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    return vendas
      .map(venda => ({ venda, cliente: clientes.find(c => c.id === venda.clienteId) }))
      .filter(({ cliente }) => (cliente?.nome || '').toLowerCase().includes(q))
      .sort((a, b) => new Date(b.venda.criadaEm) - new Date(a.venda.criadaEm))
  }, [vendas, clientes, busca])

  if (vendas.length === 0) {
    return (
      <div className="text-center py-12 text-ink-muted">
        <ShoppingBag size={36} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium">Nenhuma venda ainda</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder="Buscar por cliente…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-border rounded-2xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
        />
      </div>

      {lista.length === 0 ? (
        <p className="text-center text-ink-muted py-6 text-sm">Nenhuma venda encontrada</p>
      ) : (
        <div className="space-y-2">
          {lista.map(({ venda, cliente }) => {
            const status = statusVenda(venda)
            const nome = cliente?.nome || 'Cliente removido'
            return (
              <button
                key={venda.id}
                onClick={() => cliente && navegar('perfil', { clienteId: cliente.id })}
                disabled={!cliente}
                className="w-full bg-surface rounded-2xl shadow-sm p-4 text-left flex items-center gap-3 active:bg-surface-2 transition-colors disabled:opacity-60"
              >
                <div className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-lg">{nome[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink truncate">{nome}</p>
                  <p className="text-sm text-ink-muted truncate">{venda.itens}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-ink tabular-nums">{formatarMoeda(venda.valorTotal)}</span>
                    <span className="text-xs text-ink-muted">{formatarData(venda.criadaEm)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.classe}`}>
                    {status.label}
                  </span>
                  <ChevronRight size={16} className="text-ink-muted" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
