import { useState, useMemo } from 'react'
import { Search, ChevronRight, ShoppingBag, Filter, Calendar as CalendarIcon } from 'lucide-react'
import { formatarMoeda, formatarData } from '../utils/formatadores.js'
import { statusVenda } from '../utils/statusVenda.js'
import { vendaNoPeriodo } from '../utils/filtroVendas.js'
import { rotuloPeriodo } from '../utils/calendario.js'
import SeletorPeriodo from './SeletorPeriodo.jsx'

export default function ListaVendas({ vendas, clientes, navegar }) {
  const [modo, setModo] = useState('cliente')
  const [busca, setBusca] = useState('')
  const [granularidadePeriodo, setGranularidadePeriodo] = useState('dia')
  const [menuAberto, setMenuAberto] = useState(false)
  const [calendarioAberto, setCalendarioAberto] = useState(false)

  function escolherModo(novoModo) {
    setModo(novoModo)
    setBusca('')
    setMenuAberto(false)
  }

  const lista = useMemo(() => {
    return vendas
      .map(venda => ({ venda, cliente: clientes.find(c => c.id === venda.clienteId) }))
      .filter(({ venda, cliente }) => {
        if (modo === 'cliente') return (cliente?.nome || '').toLowerCase().includes(busca.toLowerCase())
        if (modo === 'produto') return (venda.itens || '').toLowerCase().includes(busca.toLowerCase())
        return vendaNoPeriodo(venda, granularidadePeriodo, busca)
      })
      .sort((a, b) => new Date(b.venda.criadaEm) - new Date(a.venda.criadaEm))
  }, [vendas, clientes, busca, modo, granularidadePeriodo])

  if (vendas.length === 0) {
    return (
      <div className="text-center py-12 text-ink-muted">
        <ShoppingBag size={36} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium">Nenhuma venda ainda</p>
      </div>
    )
  }

  const placeholderTexto = modo === 'cliente' ? 'Buscar por cliente…' : 'Buscar por produto…'
  const rotuloAtual = modo === 'periodo' ? rotuloPeriodo(granularidadePeriodo, busca) : ''

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          {(modo === 'cliente' || modo === 'produto') && (
            <>
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input
                type="text"
                placeholder={placeholderTexto}
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-border rounded-2xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
              />
            </>
          )}
          {modo === 'periodo' && (
            <button
              type="button"
              onClick={() => setCalendarioAberto(true)}
              className="w-full flex items-center gap-2 h-11 px-4 border border-border rounded-2xl text-sm bg-surface shadow-sm text-left"
            >
              <CalendarIcon size={16} className="text-ink-muted flex-shrink-0" />
              <span className={rotuloAtual ? 'text-ink font-medium' : 'text-ink-muted'}>
                {rotuloAtual || 'Escolher período'}
              </span>
            </button>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuAberto(a => !a)}
            className={`flex items-center justify-center w-11 h-11 rounded-2xl border transition-colors ${
              modo !== 'cliente' ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-ink-muted'
            }`}
          >
            <Filter size={18} />
          </button>

          {menuAberto && (
            <div className="absolute right-0 mt-2 w-44 bg-surface border border-border rounded-2xl shadow-sm p-1.5 z-10">
              <button
                type="button"
                onClick={() => escolherModo('cliente')}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-ink active:bg-surface-2"
              >
                Cliente
              </button>
              <button
                type="button"
                onClick={() => escolherModo('produto')}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-ink active:bg-surface-2"
              >
                Produto
              </button>
              <button
                type="button"
                onClick={() => escolherModo('periodo')}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-ink active:bg-surface-2"
              >
                Período
              </button>
            </div>
          )}
        </div>
      </div>

      {modo === 'periodo' && (
        <SeletorPeriodo
          aberto={calendarioAberto}
          onFechar={() => setCalendarioAberto(false)}
          valor={busca}
          onSelecionar={(novaGranularidade, novoValor) => {
            setGranularidadePeriodo(novaGranularidade)
            setBusca(novoValor)
            setCalendarioAberto(false)
          }}
        />
      )}

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
