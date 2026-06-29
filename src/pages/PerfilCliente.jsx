import { useState } from 'react'
import { ArrowLeft, Phone, MapPin, Home, FileText, ChevronDown, ChevronUp, CheckCircle, Circle, FileDown, Trash2, Plus } from 'lucide-react'
import ModalConfirmar from '../components/ModalConfirmar.jsx'
import { formatarMoeda, formatarData, statusParcela, formatarTelefone } from '../utils/formatadores.js'
import { gerarCarnetPDF } from '../utils/gerarPDF.js'

export default function PerfilCliente({ clienteId, clientes, vendas, marcarParcelaPaga, desmarcarParcelaPaga, removerVenda, removerCliente, navegar, mostrarToast }) {
  const [vendasAbertas, setVendasAbertas] = useState({})
  const [modalPago, setModalPago] = useState(null)
  const [modalRemover, setModalRemover] = useState(null)
  const [modalExcluirCliente, setModalExcluirCliente] = useState(false)

  const cliente = clientes.find(c => c.id === clienteId)
  if (!cliente) return null

  const vendasCliente = vendas
    .filter(v => v.clienteId === clienteId)
    .sort((a, b) => b.criadaEm.localeCompare(a.criadaEm))

  const totalDevido = vendasCliente
    .flatMap(v => v.parcelas)
    .filter(p => !p.pago)
    .reduce((acc, p) => acc + p.valor, 0)

  function toggleVenda(id) {
    setVendasAbertas(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function confirmarMarcarPago() {
    if (!modalPago) return
    marcarParcelaPaga(modalPago.vendaId, modalPago.numeroParcela)
    setModalPago(null)
    mostrarToast('✓ Parcela marcada como paga')
  }

  function confirmarRemoverVenda() {
    if (!modalRemover) return
    removerVenda(modalRemover)
    setModalRemover(null)
    mostrarToast('Venda removida', 'info')
  }

  function confirmarExcluirCliente() {
    const nome = cliente.nome
    removerCliente(clienteId)
    navegar('clientes')
    mostrarToast(`${nome} foi excluído`, 'info')
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <div className="bg-primary text-white px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navegar('clientes')}
            className="flex items-center gap-2 text-white/70 hover:text-white min-h-touch transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Clientes</span>
          </button>
          <button
            onClick={() => setModalExcluirCliente(true)}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/80 px-3 py-2 rounded-xl text-sm min-h-touch transition-colors"
          >
            <Trash2 size={15} />
            Excluir
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-extrabold text-2xl">{cliente.nome[0]?.toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">{cliente.nome}</h1>
            {cliente.bairro && <p className="text-white/60 text-sm mt-0.5">{cliente.bairro}</p>}
          </div>
        </div>

        {/* Contato */}
        {(cliente.telefone || cliente.endereco) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {cliente.telefone && (
              <a
                href={`tel:${cliente.telefone.replace(/\D/g, '')}`}
                className="flex items-center gap-1.5 bg-white/10 text-white px-3 py-2 rounded-xl text-sm min-h-touch"
              >
                <Phone size={14} />
                {formatarTelefone(cliente.telefone)}
              </a>
            )}
            {cliente.endereco && (
              <span className="flex items-center gap-1.5 bg-white/10 text-white/80 px-3 py-2 rounded-xl text-sm">
                <Home size={14} />
                {cliente.endereco}
              </span>
            )}
            {cliente.bairro && (
              <span className="flex items-center gap-1.5 bg-white/10 text-white/80 px-3 py-2 rounded-xl text-sm">
                <MapPin size={14} />
                {cliente.bairro}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Saldo total */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Saldo a Receber</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-accent font-bold text-base">R$</span>
              <span className={`text-3xl font-extrabold tabular-nums leading-none ${totalDevido > 0 ? 'text-danger' : 'text-success'}`}>
                {totalDevido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <button
            onClick={() => navegar('nova-venda', { clientePreSelecionado: clienteId })}
            className="bg-primary text-white px-4 py-2.5 rounded-xl font-semibold text-sm min-h-touch flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} />
            Nova Venda
          </button>
        </div>

        {/* Observações */}
        {cliente.observacoes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 flex gap-2">
            <FileText size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">{cliente.observacoes}</p>
          </div>
        )}

        {/* Vendas */}
        <div>
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Histórico de Compras</h2>

          {vendasCliente.length === 0 && (
            <div className="text-center py-8 text-gray-400 bg-white rounded-2xl shadow-sm">
              <p className="text-sm font-medium">Nenhuma venda registrada</p>
            </div>
          )}

          <div className="space-y-3">
            {vendasCliente.map(venda => {
              const aberta = vendasAbertas[venda.id]
              const parcelasAbertas = venda.parcelas.filter(p => !p.pago).length
              const pagas = venda.parcelas.filter(p => p.pago).length

              return (
                <div key={venda.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleVenda(venda.id)}
                    className="w-full p-4 text-left flex items-start justify-between gap-2 active:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{venda.itens}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatarData(venda.criadaEm)}</p>
                      <div className="flex gap-3 mt-1.5">
                        <span className="text-xs text-gray-500">
                          Total: <strong className="text-gray-800">{formatarMoeda(venda.valorTotal)}</strong>
                        </span>
                        {venda.entrada > 0 && (
                          <span className="text-xs text-gray-400">Entrada: {formatarMoeda(venda.entrada)}</span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        {parcelasAbertas > 0 && (
                          <span className="text-xs bg-red-50 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                            {parcelasAbertas} em aberto
                          </span>
                        )}
                        {pagas > 0 && (
                          <span className="text-xs bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                            {pagas} paga{pagas > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-gray-300 flex-shrink-0 mt-0.5">
                      {aberta ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>

                  {aberta && (
                    <div className="border-t border-gray-100">
                      <div className="space-y-1 p-3">
                        {venda.parcelas.map(p => {
                          const st = statusParcela(p)
                          return (
                            <div
                              key={p.numero}
                              className={`flex items-center gap-3 py-2 px-3 rounded-xl ${p.pago ? 'bg-green-50' : 'bg-gray-50'}`}
                            >
                              <button
                                onClick={() => {
                                  if (!p.pago) setModalPago({ vendaId: venda.id, numeroParcela: p.numero, valor: p.valor })
                                  else {
                                    desmarcarParcelaPaga(venda.id, p.numero)
                                    mostrarToast('Parcela desmarcada', 'info')
                                  }
                                }}
                                className="flex-shrink-0 min-h-touch min-w-touch flex items-center justify-center"
                              >
                                {p.pago
                                  ? <CheckCircle size={22} className="text-success" />
                                  : <Circle size={22} className="text-gray-300" />
                                }
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${p.pago ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                  Parcela {p.numero} — {formatarData(p.vencimento)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${st.bg} ${st.texto}`}>
                                  {st.label}
                                </span>
                                <span className={`text-sm font-bold tabular-nums ${p.pago ? 'text-gray-400' : 'text-gray-800'}`}>
                                  {formatarMoeda(p.valor)}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="flex gap-2 px-3 pb-3">
                        <button
                          onClick={() => gerarCarnetPDF(cliente, venda)}
                          className="flex-1 flex items-center justify-center gap-2 bg-primary-50 text-primary py-2.5 rounded-xl font-semibold text-sm active:bg-primary/10 transition-colors"
                        >
                          <FileDown size={16} />
                          Gerar Carnê PDF
                        </button>
                        <button
                          onClick={() => setModalRemover(venda.id)}
                          className="flex items-center justify-center p-2.5 bg-red-50 text-danger rounded-xl"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <ModalConfirmar
        aberto={!!modalPago}
        titulo="Confirmar Pagamento"
        mensagem={modalPago ? `Marcar parcela ${modalPago.numeroParcela} de ${formatarMoeda(modalPago.valor)} como paga?` : ''}
        onConfirmar={confirmarMarcarPago}
        onCancelar={() => setModalPago(null)}
        corConfirmar="success"
      />

      <ModalConfirmar
        aberto={!!modalRemover}
        titulo="Remover Venda"
        mensagem="Tem certeza que deseja remover esta venda? Esta ação não pode ser desfeita."
        onConfirmar={confirmarRemoverVenda}
        onCancelar={() => setModalRemover(null)}
        corConfirmar="danger"
      />

      <ModalConfirmar
        aberto={modalExcluirCliente}
        titulo="Excluir Cliente"
        mensagem={`Tem certeza que deseja excluir "${cliente.nome}"? Todo o histórico de vendas e parcelas será removido permanentemente.`}
        onConfirmar={confirmarExcluirCliente}
        onCancelar={() => setModalExcluirCliente(false)}
        corConfirmar="danger"
      />
    </div>
  )
}
