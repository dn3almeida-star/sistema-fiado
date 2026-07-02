import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import NovaVenda from '../pages/NovaVenda.jsx'
import ListaVendas from './ListaVendas.jsx'

export default function VendasTab(props) {
  const [aba, setAba] = useState('nova')

  // Criar a partir do perfil do cliente: vai direto pro criar, sem toggle.
  if (props.clientePreSelecionado) {
    return <NovaVenda {...props} />
  }

  const toggle = (
    <div className="flex gap-2 bg-white/10 p-1 rounded-2xl">
      <button
        type="button"
        onClick={() => setAba('nova')}
        className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
          aba === 'nova' ? 'bg-white text-primary shadow-sm' : 'text-white/70'
        }`}
      >
        Nova Venda
      </button>
      <button
        type="button"
        onClick={() => setAba('lista')}
        className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
          aba === 'lista' ? 'bg-white text-primary shadow-sm' : 'text-white/70'
        }`}
      >
        Vendas
      </button>
    </div>
  )

  if (aba === 'nova') {
    return <NovaVenda {...props} toggle={toggle} />
  }

  return (
    <div className="min-h-screen pb-6">
      <div className="bg-primary text-white px-4 pt-4 pb-5">
        <button
          onClick={() => props.navegar('dashboard')}
          className="flex items-center gap-2 text-white/70 mb-3 min-h-touch transition-colors hover:text-white"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Cancelar</span>
        </button>
        <h1 className="text-xl font-bold">Vendas</h1>
        <div className="mt-3">{toggle}</div>
      </div>

      <div className="p-4">
        <ListaVendas vendas={props.vendas} clientes={props.clientes} navegar={props.navegar} />
      </div>
    </div>
  )
}
