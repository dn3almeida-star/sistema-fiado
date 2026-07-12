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
import { statusPlano, deveMostrarNudgeTeste } from './utils/planos.js'
import { totalRecebido } from './utils/recuperado.js'
import { hoje } from './utils/formatadores.js'
import { useAssinatura } from './hooks/useAssinatura.js'
import ModalUpgrade from './components/ModalUpgrade.jsx'
import TelaPagamentoPix from './components/TelaPagamentoPix.jsx'
import { SkeletonDashboard } from './components/Skeleton.jsx'
import { iniciarChecagemDeAtualizacao } from './utils/checarAtualizacao.js'
import { obterNavegacaoSalva, salvarNavegacao } from './utils/navegacao.js'

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Clientes = lazy(() => import('./pages/Clientes.jsx'))
const PerfilCliente = lazy(() => import('./pages/PerfilCliente.jsx'))
const CobrancasHoje = lazy(() => import('./pages/CobrancasHoje.jsx'))
const Relatorio = lazy(() => import('./pages/Relatorio.jsx'))
const VendasTab = lazy(() => import('./components/VendasTab.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Cadastro = lazy(() => import('./pages/Cadastro.jsx'))
const PerfilLoja = lazy(() => import('./pages/PerfilLoja.jsx'))
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha.jsx'))
const ModoCobranca = lazy(() => import('./pages/ModoCobranca.jsx'))
const Metricas = lazy(() => import('./pages/Metricas.jsx'))

export default function App() {
  const [navegacaoSalva] = useState(obterNavegacaoSalva)
  // /cobrancas é o deep link do push (quando o toque na notificação abre o app).
  const [paginaAtiva, setPaginaAtiva] = useState(
    window.location.pathname === '/cobrancas' ? 'cobrancas' : (navegacaoSalva?.paginaAtiva ?? 'dashboard')
  )
  // Tela do fluxo deslogado: /cadastro (link da landing) abre direto no cadastro.
  const [telaAuth, setTelaAuth] = useState(() =>
    window.location.pathname === '/cadastro' ? 'cadastro' : 'login')
  // ?ref=<userId> do link de indicação — quem indicou este novo cadastro.
  const [indicadoPor] = useState(() => new URLSearchParams(window.location.search).get('ref') || null)
  const [clienteAtivoId, setClienteAtivoId] = useState(navegacaoSalva?.clienteAtivoId ?? null)
  const [vendaParaCliente, setVendaParaCliente] = useState(navegacaoSalva?.vendaParaCliente ?? null)

  const [toast, setToast] = useState(null)
  const [toastKey, setToastKey] = useState(0)
  const toastTimer = useRef(null)
  const [novaVersaoDisponivel, setNovaVersaoDisponivel] = useState(false)
  const [upgradeAberto, setUpgradeAberto] = useState(false)
  const [pagamentoAberto, setPagamentoAberto] = useState(false)

  useEffect(() => {
    return iniciarChecagemDeAtualizacao(() => setNovaVersaoDisponivel(true))
  }, [])

  // Toque na notificação com o app já aberto: o service worker manda navegar.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    function onMsg(e) {
      if (e.data?.tipo === 'navegar' && String(e.data.url).includes('cobrancas')) {
        setPaginaAtiva('cobrancas')
      }
    }
    navigator.serviceWorker.addEventListener('message', onMsg)
    return () => navigator.serviceWorker.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => {
    salvarNavegacao({ paginaAtiva, clienteAtivoId, vendaParaCliente })
  }, [paginaAtiva, clienteAtivoId, vendaParaCliente])

  const { session, usuario, carregando: carregandoAuth, recuperandoSenha } = useAuth()
  const clientesHook = useClientes(usuario)
  const vendasHook = useVendas(usuario)
  const profileHook = useProfile(usuario)
  const assinatura = useAssinatura(profileHook.recarregarProfile)

  // Nudge de fim de teste (gtm §5.3): faltando ≤5 dias, abre o upgrade 1x/dia.
  useEffect(() => {
    const s = statusPlano(profileHook.profile, hoje())
    const chave = 'nudge_teste_' + hoje()
    if (deveMostrarNudgeTeste(s, localStorage.getItem(chave) === '1')) {
      setUpgradeAberto(true)
      localStorage.setItem(chave, '1')
    }
  }, [profileHook.profile])

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

  const planoStatus = statusPlano(profileHook.profile, hoje())
  const abrirUpgrade = () => setUpgradeAberto(true)

  const props = {
    navegar,
    mostrarToast,
    profile: profileHook.profile,
    salvarProfile: profileHook.salvarProfile,
    enviarLogo: profileHook.enviarLogo,
    planoStatus,
    abrirUpgrade,
    ...clientesHook,
    ...vendasHook,
  }

  if (carregandoAuth) return <Splash />
  if (recuperandoSenha) return <Suspense fallback={<Splash />}><RedefinirSenha /></Suspense>
  if (!session) {
    return (
      <Suspense fallback={<Splash />}>
        {telaAuth === 'cadastro'
          ? <Cadastro aoIrParaLogin={() => setTelaAuth('login')} indicadoPor={indicadoPor} />
          : <Login aoCriarConta={() => setTelaAuth('cadastro')} />}
      </Suspense>
    )
  }
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
                {paginaAtiva === 'modo-cobranca' && <ModoCobranca {...props} />}
                {paginaAtiva === 'relatorio' && <Relatorio {...props} />}
                {paginaAtiva === 'perfil-loja' && <PerfilLoja {...props} />}
                {paginaAtiva === 'metricas' && <Metricas {...props} />}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        )}
      </main>

      <BottomNav paginaAtiva={paginaAtiva} onNavegar={navegar} />

      <ModalUpgrade
        aberto={upgradeAberto}
        valorRecebido={totalRecebido(vendasHook.vendas)}
        onFechar={() => setUpgradeAberto(false)}
        onAssinar={() => {
          setUpgradeAberto(false)
          setPagamentoAberto(true)
          assinatura.iniciar()
        }}
      />

      {pagamentoAberto && (
        <TelaPagamentoPix
          status={assinatura.status}
          pagamento={assinatura.pagamento}
          onTentarNovamente={assinatura.iniciar}
          onFechar={() => { setPagamentoAberto(false); assinatura.resetar() }}
        />
      )}
    </div>
  )
}
