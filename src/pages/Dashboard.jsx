import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Clock, CalendarCheck, BookOpen, LogOut, Sun, Moon } from 'lucide-react'
import CardResumo from '../components/CardResumo.jsx'
import NumeroAnimado from '../components/NumeroAnimado.jsx'
import EstadoVazio from '../components/EstadoVazio.jsx'
import { formatarData, hoje, diasAteVencimento } from '../utils/formatadores.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useTheme } from '../hooks/useTheme.js'
import { staggerContainer, fadeInUp } from '../utils/motion.js'

export default function Dashboard({ clientes, vendas, navegar, profile }) {
  const { logout } = useAuth()
  const { theme, toggle } = useTheme()
  const stats = useMemo(() => {
    const hj = hoje()
    let totalReceber = 0
    let vencemHoje = 0
    let emAtraso = 0
    let vencemSemana = 0
    const vencimentosHoje = []

    vendas.forEach(venda => {
      const cliente = clientes.find(c => c.id === venda.clienteId)
      venda.parcelas.forEach(p => {
        if (p.pago) return
        totalReceber += p.valor
        const dias = diasAteVencimento(p.vencimento)
        if (dias < 0) emAtraso++
        if (dias === 0) {
          vencemHoje++
          if (cliente) vencimentosHoje.push({ cliente, parcela: p, venda })
        }
        if (dias >= 0 && dias <= 7) vencemSemana++
      })
    })

    return { totalReceber, vencemHoje, emAtraso, vencemSemana, vencimentosHoje }
  }, [vendas, clientes])

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="pt-3 pb-1 flex items-center justify-between">
        <div>
          {profile?.nome_loja && <p className="text-[11px] font-mono font-medium text-primary uppercase tracking-widest">{profile.nome_loja}</p>}
          <h1 className="text-2xl font-display font-semibold text-ink leading-tight">Crediário Digital</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-ink-muted active:bg-surface-2"
            aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => navegar('perfil-loja')}
            className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm overflow-hidden"
            aria-label="Perfil da loja"
          >
            {profile?.logo_url
              ? <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
              : <BookOpen size={20} className="text-white" strokeWidth={2} />}
          </button>
          <button
            onClick={logout}
            className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-ink-muted active:bg-surface-2"
            aria-label="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Hero — Total a Receber */}
      <div className="bg-primary rounded-2xl p-5 shadow-sm">
        <p className="text-[11px] font-mono font-medium uppercase tracking-widest text-white/60">Total a Receber</p>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-accent font-mono font-medium text-lg">R$</span>
          <NumeroAnimado
            valor={stats.totalReceber}
            className="text-4xl font-mono font-semibold text-white tabular-nums leading-none"
          />
        </div>
        <p className="text-xs text-white/40 mt-2.5">saldo devedor dos clientes</p>
      </div>

      {/* Grid de stats */}
      <div className="grid grid-cols-2 gap-3">
        <CardResumo
          titulo="Em Atraso"
          valor={stats.emAtraso}
          sub="parcelas"
          icone={AlertCircle}
          cor="danger"
        />
        <CardResumo
          titulo="Vencem Hoje"
          valor={stats.vencemHoje}
          sub="parcelas"
          icone={Clock}
          cor={stats.vencemHoje > 0 ? 'warning' : 'success'}
        />
        <div className="col-span-2">
          <CardResumo
            titulo="Vencem Esta Semana"
            valor={stats.vencemSemana}
            sub="parcelas nos próximos 7 dias"
            icone={CalendarCheck}
            cor="primary"
          />
        </div>
      </div>

      {/* Cobranças de hoje */}
      {stats.vencimentosHoje.length > 0 && (
        <div>
          <h2 className="text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-widest mb-2">Cobranças de Hoje</h2>
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
            {stats.vencimentosHoje.map(({ cliente, parcela, venda }) => (
              <motion.div variants={fadeInUp} whileTap={{ scale: 0.98 }} key={`${venda.id}-${parcela.numero}`}>
                <button
                  onClick={() => navegar('perfil', { clienteId: cliente.id })}
                  className="w-full bg-surface rounded-2xl shadow-sm p-4 text-left flex items-center justify-between active:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
                      <span className="font-display font-semibold text-ink-muted text-base">{cliente.nome[0]?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium text-ink">{cliente.nome}</p>
                      <p className="text-xs font-mono text-ink-muted mt-0.5">Parcela {parcela.numero} — {formatarData(parcela.vencimento)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 font-mono">
                    <span className="text-xs text-accent font-medium">R$</span>
                    <span className="text-base font-semibold text-ink tabular-nums ml-0.5">
                      {parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {stats.vencimentosHoje.length === 0 && stats.emAtraso === 0 && (
        <EstadoVazio icone={CalendarCheck} titulo="Nenhuma cobrança para hoje" />
      )}
    </div>
  )
}
