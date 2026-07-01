import { useMemo } from 'react'
import { Bell } from 'lucide-react'
import BotaoWhatsApp from '../components/BotaoWhatsApp.jsx'
import { formatarMoeda, formatarData, hoje } from '../utils/formatadores.js'

function montarMensagem(cliente, parcela) {
  const valor = formatarMoeda(parcela.valor)
  const oi = '☺'   // ☺ (BMP — suportado em todos os aparelhos)
  const ok = '✔'   // ✔
  return `Olá ${cliente.nome}! ${oi} Passando para lembrar que a parcela ${parcela.numero} no valor de ${valor} vence hoje. Qualquer dúvida é só falar! ${ok}`
}

export default function CobrancasHoje({ clientes, vendas, navegar }) {
  const cobrancas = useMemo(() => {
    const hj = hoje()
    const lista = []
    vendas.forEach(venda => {
      venda.parcelas.forEach(parcela => {
        if (parcela.pago || parcela.vencimento !== hj) return
        const cliente = clientes.find(c => c.id === venda.clienteId)
        if (cliente) lista.push({ cliente, parcela, venda })
      })
    })
    return lista.sort((a, b) => a.cliente.nome.localeCompare(b.cliente.nome))
  }, [vendas, clientes])

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="pt-3 pb-1">
        <h1 className="text-2xl font-extrabold text-gray-900">Cobranças</h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {cobrancas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-bold text-gray-500">Nenhuma cobrança para hoje!</p>
          <p className="text-sm mt-1">Aproveite o dia 🎉</p>
        </div>
      ) : (
        <>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
            <p className="text-sm text-orange-800 font-medium">
              <strong>{cobrancas.length}</strong> {cobrancas.length === 1 ? 'parcela vence' : 'parcelas vencem'} hoje.
            </p>
          </div>

          <div className="space-y-3">
            {cobrancas.map(({ cliente, parcela, venda }) => (
              <div
                key={`${venda.id}-${parcela.numero}`}
                className="bg-white rounded-2xl shadow-sm p-4 space-y-3"
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
                      <p className="font-bold text-gray-900">{cliente.nome}</p>
                      {cliente.bairro && <p className="text-xs text-gray-500">{cliente.bairro}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-baseline gap-0.5 justify-end">
                        <span className="text-accent text-xs font-semibold">R$</span>
                        <span className="text-xl font-extrabold text-gray-900 tabular-nums">
                          {parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">Parcela {parcela.numero}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 truncate">📦 {venda.itens}</p>
                </button>

                <div className="flex gap-2">
                  {cliente.telefone && (
                    <BotaoWhatsApp
                      telefone={cliente.telefone}
                      mensagem={montarMensagem(cliente, parcela)}
                      className="flex-1 justify-center"
                    />
                  )}
                  <button
                    onClick={() => navegar('perfil', { clienteId: cliente.id })}
                    className="flex-1 border-2 border-primary text-primary py-2.5 rounded-xl font-semibold text-sm min-h-touch transition-colors active:bg-primary-50"
                  >
                    Ver Perfil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
