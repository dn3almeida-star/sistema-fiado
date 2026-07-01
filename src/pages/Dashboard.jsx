import { useMemo } from 'react'
import { AlertCircle, Clock, CalendarCheck, BookOpen, LogOut } from 'lucide-react'
import CardResumo from '../components/CardResumo.jsx'
import { formatarData, hoje, diasAteVencimento } from '../utils/formatadores.js'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Dashboard({ clientes, vendas, navegar, profile }) {
  const { logout } = useAuth()
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

  const totalFormatado = totalReceber =>
    totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="pt-3 pb-1 flex items-center justify-between">
        <div>
          {profile?.nome_loja && <p className="text-[11px] font-semibold text-primary uppercase tracking-widest">{profile.nome_loja}</p>}
          <h1 className="text-2xl font-extrabold text-ink leading-tight">Crediário Digital</h1>
        </div>
        <div className="flex items-center gap-2">
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
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Total a Receber</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-accent font-bold text-xl">R$</span>
          <span className="text-4xl font-extrabold text-white tabular-nums leading-none">
            {totalFormatado(stats.totalReceber)}
          </span>
        </div>
        <p className="text-xs text-white/40 mt-2">saldo devedor dos clientes</p>
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
          <h2 className="text-sm font-bold text-ink-muted uppercase tracking-wide mb-2">Cobranças de Hoje</h2>
          <div className="space-y-2">
            {stats.vencimentosHoje.map(({ cliente, parcela, venda }) => (
              <button
                key={`${venda.id}-${parcela.numero}`}
                onClick={() => navegar('perfil', { clienteId: cliente.id })}
                className="w-full bg-surface rounded-2xl shadow-sm p-4 text-left flex items-center justify-between active:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-700 font-bold text-base">{cliente.nome[0]?.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{cliente.nome}</p>
                    <p className="text-xs text-ink-muted mt-0.5">Parcela {parcela.numero} — {formatarData(parcela.vencimento)}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs text-accent font-semibold">R$</span>
                  <span className="text-base font-bold text-ink tabular-nums ml-0.5">
                    {parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {stats.vencimentosHoje.length === 0 && stats.emAtraso === 0 && (
        <div className="text-center py-10 text-ink-muted">
          <CalendarCheck size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Nenhuma cobrança para hoje</p>
        </div>
      )}
    </div>
  )
}
