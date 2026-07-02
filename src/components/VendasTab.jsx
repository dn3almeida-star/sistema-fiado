import { useState } from 'react'
import NovaVenda from '../pages/NovaVenda.jsx'
import ListaVendas from './ListaVendas.jsx'

export default function VendasTab(props) {
  const [aba, setAba] = useState('nova')

  // Criar a partir do perfil do cliente: vai direto pro criar, sem toggle.
  if (props.clientePreSelecionado) {
    return <NovaVenda {...props} />
  }

  return (
    <div>
      <div className="p-4 pb-0">
        <div className="flex gap-2 bg-surface-2 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setAba('nova')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              aba === 'nova' ? 'bg-primary text-white shadow-sm' : 'text-ink-muted'
            }`}
          >
            Nova Venda
          </button>
          <button
            type="button"
            onClick={() => setAba('lista')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              aba === 'lista' ? 'bg-primary text-white shadow-sm' : 'text-ink-muted'
            }`}
          >
            Vendas
          </button>
        </div>
      </div>

      {aba === 'nova' ? (
        <NovaVenda {...props} />
      ) : (
        <div className="p-4">
          <ListaVendas vendas={props.vendas} clientes={props.clientes} navegar={props.navegar} />
        </div>
      )}
    </div>
  )
}
