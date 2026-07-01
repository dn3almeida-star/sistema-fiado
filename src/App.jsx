import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import PerfilLoja from './pages/PerfilLoja.jsx'
import RedefinirSenha from './pages/RedefinirSenha.jsx'
import { useProfile } from './hooks/useProfile.js'
import { perfilCompleto } from './utils/perfil.js'
import { SkeletonDashboard } from './components/Skeleton.jsx'

export default function App() {
  const [paginaAtiva, setPaginaAtiva] = useState('dashboard')
  const [clienteAtivoId, setClienteAtivoId] = useState(null)
  const [vendaParaCliente, setVendaParaCliente] = useState(null)

  const [toast, setToast] = useState(null)
  const [toastKey, setToastKey] = useState(0)
  const toastTimer = useRef(null)

  const clientesHook = useClientes()
  const vendasHook = useVendas()
  const { session, usuario, carregando: carregandoAuth, recuperandoSenha } = useAuth()
  const profileHook = useProfile(usuario)

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

  const props = {
    navegar,
    mostrarToast,
    profile: profileHook.profile,
    salvarProfile: profileHook.salvarProfile,
    enviarLogo: profileHook.enviarLogo,
    ...clientesHook,
    ...vendasHook,
  }

  if (carregandoAuth) return <Splash />
  if (recuperandoSenha) return <RedefinirSenha />
  if (!session) return <Login />
  if (profileHook.carregandoProfile) return <Splash />
  if (!perfilCompleto(profileHook.profile)) {
    return (
      <PerfilLoja
        profile={profileHook.profile}
        salvarProfile={profileHook.salvarProfile}
        enviarLogo={profileHook.enviarLogo}
        mostrarToast={mostrarToast}
        modoInicial
        onConcluir={() => setPaginaAtiva('dashboard')}
      />
    )
  }
  const carregandoDados = clientesHook.carregandoClientes || vendasHook.carregandoVendas

  return (
    <div className="flex flex-col min-h-screen bg-ground">
      <Toast key={toastKey} mensagem={toast?.mensagem} tipo={toast?.tipo} />

      <main className="flex-1 overflow-y-auto pb-20">
        {carregandoDados ? (
          <SkeletonDashboard />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={paginaAtiva}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
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
              {paginaAtiva === 'perfil-loja' && <PerfilLoja {...props} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <BottomNav paginaAtiva={paginaAtiva} onNavegar={navegar} />
    </div>
  )
}
