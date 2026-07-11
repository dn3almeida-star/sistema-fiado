import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Bell, Send } from 'lucide-react'
import BotaoCobranca from '../components/BotaoCobranca.jsx'
import EstadoVazio from '../components/EstadoVazio.jsx'
import { formatarMoeda, formatarData, diasAteVencimento, statusParcela, hoje } from '../utils/formatadores.js'
import { staggerContainer, fadeInUp } from '../utils/motion.js'
import { rotuloUltimaCobranca } from '../utils/cobrancaSelo.js'
import { construirFilaCobranca } from '../utils/filaCobranca.js'

function CartaoCobranca({ cliente, parcela, venda, navegar, registrarCobranca, mostrarToast, bloqueado, onUpgrade }) {
  const st = statusParcela(parcela)
  const selo = rotuloUltimaCobranca(parcela.ultimaCobrancaEm, new Date().toISOString())
  return (
    <motion.div
      variants={fadeInUp}
      className="bg-surface rounded-2xl shadow-sm p-4 space-y-3"
    >
      <button
        onClick={() => navegar('perfil', { clienteId: cliente.id })}
        className="w-full text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-shrink-0">
            <span className="font-display font-semibold text-ink-muted text-base">{cliente.nome[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink">{cliente.nome}</p>
            {cliente.bairro && <p className="text-xs font-mono text-ink-muted">{cliente.bairro}</p>}
          </div>
          <div className="text-right flex-shrink-0 font-mono">
            <div className="flex items-baseline gap-0.5 justify-end">
              <span className="text-accent text-xs font-medium">R$</span>
              <span className="text-xl font-semibold text-ink tabular-nums">
                {parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-ink-muted">Parcela {parcela.numero}/{venda.parcelas.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide flex-shrink-0 ${st.bg} ${st.texto}`}>
            {st.label}
          </span>
          {selo && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-medium bg-surface-2 text-ink-muted flex-shrink-0">
              {selo}
            </span>
          )}
          <p className="text-xs text-ink-muted truncate">📦 {venda.itens}</p>
        </div>
      </button>

      <div className="flex gap-2">
        <BotaoCobranca
          parcela={parcela}
          cliente={cliente}
          venda={venda}
          bloqueado={bloqueado}
          onUpgrade={onUpgrade}
          onRegistrar={async () => {
            try {
              await registrarCobranca(venda.id, parcela.numero)
              mostrarToast('✓ Cobrança registrada')
            } catch {
              mostrarToast('Erro ao registrar cobrança.', 'error')
            }
          }}
        />
        <button
          onClick={() => navegar('perfil', { clienteId: cliente.id })}
          className="flex-1 border-2 border-primary text-primary py-2.5 rounded-xl font-semibold text-sm min-h-touch transition-colors active:bg-primary-50"
        >
          Ver Perfil
        </button>
      </div>
    </motion.div>
  )
}

export default function CobrancasHoje({ clientes, vendas, navegar, registrarCobranca, mostrarToast, planoStatus, abrirUpgrade }) {
  const bloqueado = !planoStatus?.entitlements?.cobranca
  const cobrancas = useMemo(() => {
    const lista = []
    vendas.forEach(venda => {
      venda.parcelas.forEach(parcela => {
        if (parcela.pago) return
        const cliente = clientes.find(c => c.id === venda.clienteId)
        if (cliente) lista.push({ cliente, parcela, venda })
      })
    })
    return lista.sort((a, b) =>
      diasAteVencimento(a.parcela.vencimento) - diasAteVencimento(b.parcela.vencimento) ||
      a.cliente.nome.localeCompare(b.cliente.nome)
    )
  }, [vendas, clientes])

  const vencidas = useMemo(
    () => cobrancas.filter(c => diasAteVencimento(c.parcela.vencimento) < 0),
    [cobrancas]
  )
  const aVencer = useMemo(
    () => cobrancas.filter(c => diasAteVencimento(c.parcela.vencimento) >= 0),
    [cobrancas]
  )

  const filaHoje = useMemo(
    () => construirFilaCobranca(vendas, clientes, hoje(), new Date().toISOString()),
    [vendas, clientes]
  )

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="pt-3 pb-1">
        <h1 className="text-2xl font-display font-semibold text-ink">Cobranças</h1>
        <p className="text-sm font-mono text-ink-muted mt-0.5 capitalize">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {cobrancas.length === 0 ? (
        <EstadoVazio
          icone={Bell}
          titulo="Tudo em dia!"
          descricao="Nenhuma cobrança pendente."
        />
      ) : (
        <>
          <div className="bg-accent/10 border border-accent/20 rounded-2xl px-4 py-3">
            <p className="text-sm text-ink font-medium">
              <strong className="font-mono">{cobrancas.length}</strong> {cobrancas.length === 1 ? 'parcela em aberto' : 'parcelas em aberto'}, da mais urgente para a mais distante.
            </p>
          </div>

          {filaHoje.length > 0 && (
            <button
              onClick={() => (bloqueado ? abrirUpgrade() : navegar('modo-cobranca'))}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-2xl font-semibold active:bg-primary-light transition-colors shadow-sm"
            >
              <Send size={18} /> Iniciar cobrança do dia ({filaHoje.length})
            </button>
          )}

          {vencidas.length > 0 && (
            <div>
              <h2 className="text-[11px] font-mono font-semibold text-red-500 uppercase tracking-widest mb-2">
                Vencidas ({vencidas.length})
              </h2>
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
                {vencidas.map(({ cliente, parcela, venda }) => (
                  <CartaoCobranca
                    key={`${venda.id}-${parcela.numero}`}
                    cliente={cliente}
                    parcela={parcela}
                    venda={venda}
                    navegar={navegar}
                    registrarCobranca={registrarCobranca}
                    mostrarToast={mostrarToast}
                    bloqueado={bloqueado}
                    onUpgrade={abrirUpgrade}
                  />
                ))}
              </motion.div>
            </div>
          )}

          {aVencer.length > 0 && (
            <div>
              <h2 className="text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-widest mb-2">
                A vencer ({aVencer.length})
              </h2>
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
                {aVencer.map(({ cliente, parcela, venda }) => (
                  <CartaoCobranca
                    key={`${venda.id}-${parcela.numero}`}
                    cliente={cliente}
                    parcela={parcela}
                    venda={venda}
                    navegar={navegar}
                    registrarCobranca={registrarCobranca}
                    mostrarToast={mostrarToast}
                    bloqueado={bloqueado}
                    onUpgrade={abrirUpgrade}
                  />
                ))}
              </motion.div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
