import { useState, useRef } from 'react'
import BottomNav from './components/BottomNav.jsx'
import Toast from './components/Toast.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Clientes from './pages/Clientes.jsx'
import PerfilCliente from './pages/PerfilCliente.jsx'
import NovaVenda from './pages/NovaVenda.jsx'
import CobrancasHoje from './pages/CobrancasHoje.jsx'
import Relatorio from './pages/Relatorio.jsx'
import { useClientes } from './hooks/useClientes.js'
import { useVendas } from './hooks/useVendas.js'
import { useAuth } from './hooks/useAuth.jsx'
import Login from './pages/Login.jsx'
import Splash from './components/Splash.jsx'

export default function App() {
  const [paginaAtiva, setPaginaAtiva] = useState('dashboard')
  const [clienteAtivoId, setClienteAtivoId] = useState(null)
  const [vendaParaCliente, setVendaParaCliente] = useState(null)

  const [toast, setToast] = useState(null)
  const [toastKey, setToastKey] = useState(0)
  const toastTimer = useRef(null)

  const clientesHook = useClientes()
  const vendasHook = useVendas()
  const { session, carregando: carregandoAuth } = useAuth()

  function navegar(pagina, params = {}) {
    if (params.clienteId !== undefined) setClienteAtivoId(params.clienteId)
    if (params.clientePreSelecionado !== undefined) setVendaParaCliente(params.clientePreSelecionado)
    setPaginaAtiva(pagina)
  }

  function mostrarToast(mensagem, tipo = 'success') {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastKey(k => k + 1)
    setToast({ mensagem, tipo })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  const props = { navegar, mostrarToast, ...clientesHook, ...vendasHook }

  if (carregandoAuth) return <Splash />
  if (!session) return <Login />

  return (
    <div className="flex flex-col min-h-screen bg-ground">
      <Toast key={toastKey} mensagem={toast?.mensagem} tipo={toast?.tipo} />

      <main className="flex-1 overflow-y-auto pb-20">
        {paginaAtiva === 'dashboard' && <Dashboard {...props} />}
        {paginaAtiva === 'clientes' && <Clientes {...props} />}
        {paginaAtiva === 'perfil' && (
          <PerfilCliente {...props} clienteId={clienteAtivoId} />
        )}
        {paginaAtiva === 'nova-venda' && (
          <NovaVenda {...props} clientePreSelecionado={vendaParaCliente} />
        )}
        {paginaAtiva === 'cobrancas' && <CobrancasHoje {...props} />}
        {paginaAtiva === 'relatorio' && <Relatorio {...props} />}
      </main>

      <BottomNav paginaAtiva={paginaAtiva} onNavegar={navegar} />
    </div>
  )
}
