import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BottomNav from './components/BottomNav.jsx'
import Toast from './components/Toast.jsx'
import AvisoAtualizacao from './components/AvisoAtualizacao.jsx'
import { useClientes } from './hooks/useClientes.js'
import { useVendas } from './hooks/useVendas.js'
import { useAuth } from './hooks/useAuth.jsx'
import Splash from './components/Splash.jsx'
import { useProfile } from './hooks/useProfile.js'
import { perfilCompleto } from './utils/perfil.js'
import { SkeletonDashboard } from './components/Skeleton.jsx'
import { iniciarChecagemDeAtualizacao } from './utils/checarAtualizacao.js'

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Clientes = lazy(() => import('./pages/Clientes.jsx'))
const PerfilCliente = lazy(() => import('./pages/PerfilCliente.jsx'))
const CobrancasHoje = lazy(() => import('./pages/CobrancasHoje.jsx'))
const Relatorio = lazy(() => import('./pages/Relatorio.jsx'))
const VendasTab = lazy(() => import('./components/VendasTab.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const PerfilLoja = lazy(() => import('./pages/PerfilLoja.jsx'))
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha.jsx'))

export default function App() {
  const [paginaAtiva, setPaginaAtiva] = useState('dashboard')
  const [clienteAtivoId, setClienteAtivoId] = useState(null)
  const [vendaParaCliente, setVendaParaCliente] = useState(null)

  const [toast, setToast] = useState(null)
  const [toastKey, setToastKey] = useState(0)
  const toastTimer = useRef(null)
  const [novaVersaoDisponivel, setNovaVersaoDisponivel] = useState(false)

  useEffect(() => {
    return iniciarChecagemDeAtualizacao(() => setNovaVersaoDisponivel(true))
  }, [])

  const { session, usuario, carregando: carregandoAuth, recuperandoSenha } = useAuth()
  const clientesHook = useClientes(usuario)
  const vendasHook = useVendas(usuario)
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
  if (recuperandoSenha) return <Suspense fallback={<Splash />}><RedefinirSenha /></Suspense>
  if (!session) return <Suspense fallback={<Splash />}><Login /></Suspense>
  if (profileHook.carregandoProfile) return <Splash />
  if (!perfilCompleto(profileHook.profile)) {
    return (
      <Suspense fallback={<Splash />}>
        <PerfilLoja
          profile={profileHook.profile}
          salvarProfile={profileHook.salvarProfile}
          enviarLogo={profileHook.enviarLogo}
          mostrarToast={mostrarToast}
          modoInicial
          onConcluir={() => setPaginaAtiva('dashboard')}
        />
      </Suspense>
    )
  }
  const carregandoDados = clientesHook.carregandoClientes || vendasHook.carregandoVendas

  return (
    <div className="flex flex-col min-h-screen bg-ground">
      {novaVersaoDisponivel ? (
        <AvisoAtualizacao />
      ) : (
        <Toast key={toastKey} mensagem={toast?.mensagem} tipo={toast?.tipo} />
      )}

      <main className="flex-1 overflow-y-auto pb-20">
        {carregandoDados ? (
          <SkeletonDashboard />
        ) : (
          <Suspense fallback={<SkeletonDashboard />}>
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
                  <VendasTab {...props} clientePreSelecionado={vendaParaCliente} />
                )}
                {paginaAtiva === 'cobrancas' && <CobrancasHoje {...props} />}
                {paginaAtiva === 'relatorio' && <Relatorio {...props} />}
                {paginaAtiva === 'perfil-loja' && <PerfilLoja {...props} />}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        )}
      </main>

      <BottomNav paginaAtiva={paginaAtiva} onNavegar={navegar} />
    </div>
  )
}
