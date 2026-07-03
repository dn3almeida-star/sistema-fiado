import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Bell } from 'lucide-react'
import BotaoCobranca from '../components/BotaoCobranca.jsx'
import EstadoVazio from '../components/EstadoVazio.jsx'
import { formatarMoeda, formatarData, diasAteVencimento, statusParcela } from '../utils/formatadores.js'
import { staggerContainer, fadeInUp } from '../utils/motion.js'

export default function CobrancasHoje({ clientes, vendas, navegar, registrarCobranca, mostrarToast }) {
  const cobrancas = useMemo(() => {
    const lista = []
    vendas.forEach(venda => {
      venda.parcelas.forEach(parcela => {
        if (parcela.pago || diasAteVencimento(parcela.vencimento) > 7) return
        const cliente = clientes.find(c => c.id === venda.clienteId)
        if (cliente) lista.push({ cliente, parcela, venda })
      })
    })
    return lista.sort((a, b) =>
      diasAteVencimento(a.parcela.vencimento) - diasAteVencimento(b.parcela.vencimento) ||
      a.cliente.nome.localeCompare(b.cliente.nome)
    )
  }, [vendas, clientes])

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="pt-3 pb-1">
        <h1 className="text-2xl font-extrabold text-ink">Cobranças</h1>
        <p className="text-sm text-ink-muted mt-0.5 capitalize">
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
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
            <p className="text-sm text-orange-800 font-medium">
              <strong>{cobrancas.length}</strong> {cobrancas.length === 1 ? 'cobrança pendente' : 'cobranças pendentes'}: atrasadas, vencendo hoje ou nos próximos 7 dias.
            </p>
          </div>

          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
            {cobrancas.map(({ cliente, parcela, venda }) => {
              const st = statusParcela(parcela)
              return (
              <motion.div
                variants={fadeInUp}
                key={`${venda.id}-${parcela.numero}`}
                className="bg-surface rounded-2xl shadow-sm p-4 space-y-3"
              >
                <button
                  onClick={() => navegar('perfil', { clienteId: cliente.id })}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-base">{cliente.nome[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink">{cliente.nome}</p>
                      {cliente.bairro && <p className="text-xs text-ink-muted">{cliente.bairro}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-baseline gap-0.5 justify-end">
                        <span className="text-accent text-xs font-semibold">R$</span>
                        <span className="text-xl font-extrabold text-ink tabular-nums">
                          {parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted">Parcela {parcela.numero}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${st.bg} ${st.texto}`}>
                      {st.label}
                    </span>
                    <p className="text-xs text-ink-muted truncate">📦 {venda.itens}</p>
                  </div>
                </button>

                <div className="flex gap-2">
                  <BotaoCobranca
                    parcela={parcela}
                    cliente={cliente}
                    venda={venda}
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
            })}
          </motion.div>
        </>
      )}
    </div>
  )
}
