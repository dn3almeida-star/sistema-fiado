import { useState } from 'react'
import { ArrowLeft, Phone, MapPin, Home, FileText, ChevronDown, ChevronUp, CheckCircle, Circle, FileDown, Trash2, Plus, Pencil, Check, X, Lock } from 'lucide-react'
import ModalConfirmar from '../components/ModalConfirmar.jsx'
import ModalConfirmarPagamento from '../components/ModalConfirmarPagamento.jsx'
import BotaoCobranca from '../components/BotaoCobranca.jsx'
import BotaoPix from '../components/BotaoPix.jsx'
import SeloPago from '../components/SeloPago.jsx'
import Timeline from '../components/Timeline.jsx'
import { formatarMoeda, formatarData, statusParcela, formatarTelefone, mascaraTelefone, mascaraCPF, validarCPF } from '../utils/formatadores.js'
import { ehVendaAvista } from '../utils/vendaAvista.js'
import { gerarCarnetPDF } from '../utils/gerarPDF.js'

export default function PerfilCliente({ clienteId, clientes, vendas, marcarParcelaPaga, desmarcarParcelaPaga, alterarVencimento, registrarCobranca, removerVenda, removerCliente, atualizarCliente, navegar, mostrarToast, profile, planoStatus, abrirUpgrade }) {
  const bloqueado = !planoStatus?.entitlements?.cobranca
  const podePdf = !!planoStatus?.entitlements?.pdf
  const [vendasAbertas, setVendasAbertas] = useState({})
  const [modalPago, setModalPago] = useState(null)
  const [modalRemover, setModalRemover] = useState(null)
  const [modalExcluirCliente, setModalExcluirCliente] = useState(false)
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [abaSelecionada, setAbaSelecionada] = useState('perfil')

  const cliente = clientes.find(c => c.id === clienteId)
  if (!cliente) return null

  function abrirEdicao() {
    setForm({
      nome: cliente.nome,
      telefone: mascaraTelefone(cliente.telefone ?? ''),
      cpf: mascaraCPF(cliente.cpf ?? ''),
      endereco: cliente.endereco ?? '',
      bairro: cliente.bairro ?? '',
      observacoes: cliente.observacoes ?? '',
    })
    setEditando(true)
  }

  function cancelarEdicao() {
    setEditando(false)
    setForm(null)
  }

  async function salvarEdicao() {
    if (!form.nome.trim()) return
    if (form.cpf.trim() && !validarCPF(form.cpf)) {
      mostrarToast('CPF inválido', 'error')
      return
    }
    setSalvando(true)
    try {
      await atualizarCliente(clienteId, {
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        cpf: form.cpf.trim(),
        endereco: form.endereco.trim(),
        bairro: form.bairro.trim(),
        observacoes: form.observacoes.trim(),
      })
      setEditando(false)
      setForm(null)
      mostrarToast('✓ Cliente atualizado')
    } catch (e) {
      if (e && e.tipo === 'cpf_duplicado') {
        mostrarToast(e.nome ? `CPF já cadastrado para ${e.nome}` : 'Este CPF já está cadastrado', 'error')
      } else {
        mostrarToast('Erro ao salvar alterações.', 'error')
      }
    } finally {
      setSalvando(false)
    }
  }

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

  async function confirmarMarcarPago(valorPago) {
    if (!modalPago) return
    try {
      await marcarParcelaPaga(modalPago.vendaId, modalPago.numeroParcela, valorPago)
      setModalPago(null)
      mostrarToast('✓ Parcela marcada como paga')
    } catch {
      mostrarToast('Erro ao atualizar a parcela.', 'error')
    }
  }

  async function confirmarRemoverVenda() {
    if (!modalRemover) return
    try {
      await removerVenda(modalRemover)
      setModalRemover(null)
      mostrarToast('Venda removida', 'info')
    } catch {
      mostrarToast('Erro ao remover a venda.', 'error')
    }
  }

  async function confirmarExcluirCliente() {
    const nome = cliente.nome
    try {
      await removerCliente(clienteId)
      navegar('clientes')
      mostrarToast(`${nome} foi excluído`, 'info')
    } catch {
      mostrarToast('Erro ao excluir o cliente.', 'error')
    }
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <div className="bg-primary text-white px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => editando ? cancelarEdicao() : navegar('clientes')}
            className="flex items-center gap-2 text-white/70 hover:text-white min-h-touch transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{editando ? 'Cancelar' : 'Clientes'}</span>
          </button>
          {editando ? (
            <button
              onClick={salvarEdicao}
              disabled={salvando || !form?.nome?.trim()}
              className="flex items-center gap-1.5 bg-white text-primary px-3 py-2 rounded-xl text-sm font-bold min-h-touch disabled:opacity-50 transition-colors"
            >
              <Check size={15} />
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={abrirEdicao}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/80 px-3 py-2 rounded-xl text-sm min-h-touch transition-colors"
              >
                <Pencil size={15} />
                Editar
              </button>
              <button
                onClick={() => setModalExcluirCliente(true)}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/80 px-3 py-2 rounded-xl text-sm min-h-touch transition-colors"
              >
                <Trash2 size={15} />
                Excluir
              </button>
            </div>
          )}
        </div>

        {editando ? (
          <div className="space-y-2.5">
            <input
              autoFocus
              type="text"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Nome *"
              className="w-full bg-white/15 text-white placeholder-white/50 px-4 py-3 rounded-xl text-base outline-none focus:bg-white/25 transition-colors"
            />
            <input
              type="tel"
              inputMode="numeric"
              value={form.telefone}
              onChange={e => setForm(f => ({ ...f, telefone: mascaraTelefone(e.target.value) }))}
              placeholder="(00)00000-0000"
              className="w-full bg-white/15 text-white placeholder-white/50 px-4 py-3 rounded-xl text-base outline-none focus:bg-white/25 transition-colors"
            />
            <input
              type="text"
              inputMode="numeric"
              value={form.cpf}
              onChange={e => setForm(f => ({ ...f, cpf: mascaraCPF(e.target.value) }))}
              placeholder="CPF (000.000.000-00)"
              className="w-full bg-white/15 text-white placeholder-white/50 px-4 py-3 rounded-xl text-base outline-none focus:bg-white/25 transition-colors"
            />
            <input
              type="text"
              value={form.endereco}
              onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
              placeholder="Endereço"
              className="w-full bg-white/15 text-white placeholder-white/50 px-4 py-3 rounded-xl text-base outline-none focus:bg-white/25 transition-colors"
            />
            <input
              type="text"
              value={form.bairro}
              onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))}
              placeholder="Bairro"
              className="w-full bg-white/15 text-white placeholder-white/50 px-4 py-3 rounded-xl text-base outline-none focus:bg-white/25 transition-colors"
            />
            <textarea
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              placeholder="Observações"
              rows={2}
              className="w-full bg-white/15 text-white placeholder-white/50 px-4 py-3 rounded-xl text-base outline-none focus:bg-white/25 transition-colors resize-none"
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-display font-semibold text-2xl">{cliente.nome[0]?.toUpperCase()}</span>
              </div>
              <div>
                <h1 className="text-xl font-display font-semibold leading-tight">{cliente.nome}</h1>
                {cliente.bairro && <p className="text-white/60 text-sm font-mono mt-0.5">{cliente.bairro}</p>}
              </div>
            </div>

            {(cliente.telefone || cliente.endereco || cliente.cpf) && (
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
                {cliente.cpf && (
                  <span className="flex items-center gap-1.5 bg-white/10 text-white/80 px-3 py-2 rounded-xl text-sm">
                    <FileText size={14} />
                    {mascaraCPF(cliente.cpf)}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-border bg-surface px-4">
        <button
          onClick={() => setAbaSelecionada('perfil')}
          className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
            abaSelecionada === 'perfil'
              ? 'text-primary border-primary'
              : 'text-ink-muted border-transparent hover:text-ink'
          }`}
        >
          Perfil
        </button>
        <button
          onClick={() => setAbaSelecionada('timeline')}
          className={`px-4 py-3 font-semibold text-sm transition-colors border-b-2 ${
            abaSelecionada === 'timeline'
              ? 'text-primary border-primary'
              : 'text-ink-muted border-transparent hover:text-ink'
          }`}
        >
          Timeline
        </button>
      </div>

      <div className="p-4 space-y-4">
        {abaSelecionada === 'perfil' ? (
          <>
            {/* Saldo total */}
            <div className="bg-surface rounded-2xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-mono font-medium text-ink-muted uppercase tracking-wider">Saldo a Receber</p>
                <div className="flex items-baseline gap-1 mt-1 font-mono">
                  <span className="text-accent font-medium text-base">R$</span>
                  <span className={`text-3xl font-semibold tabular-nums leading-none ${totalDevido > 0 ? 'text-danger' : 'text-success'}`}>
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
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-3 flex gap-2">
                <FileText size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-ink">{cliente.observacoes}</p>
              </div>
            )}

            {/* Vendas */}
            <div>
              <h2 className="text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-widest mb-2">Histórico de Compras</h2>

              {vendasCliente.length === 0 && (
                <div className="text-center py-8 text-ink-muted bg-surface rounded-2xl shadow-sm">
                  <p className="text-sm font-medium">Nenhuma venda registrada</p>
                </div>
              )}

              <div className="space-y-3">
                {vendasCliente.map(venda => {
                  const aberta = vendasAbertas[venda.id]
                  const parcelasAbertas = venda.parcelas.filter(p => !p.pago).length
                  const pagas = venda.parcelas.filter(p => p.pago).length
                  const avista = ehVendaAvista(venda)

                  return (
                    <div key={venda.id} className="bg-surface rounded-2xl shadow-sm overflow-hidden">
                      <button
                        onClick={() => toggleVenda(venda.id)}
                        className="w-full p-4 text-left flex items-start justify-between gap-2 active:bg-surface-2 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-ink truncate">{venda.itens}</p>
                          <p className="text-xs font-mono text-ink-muted mt-0.5">{formatarData(venda.criadaEm)}</p>
                          <div className="flex gap-3 mt-1.5 font-mono">
                            <span className="text-xs text-ink-muted">
                              Total: <strong className="text-ink font-semibold">{formatarMoeda(venda.valorTotal)}</strong>
                            </span>
                            {venda.entrada > 0 && (
                              <span className="text-xs text-ink-muted">Entrada: {formatarMoeda(venda.entrada)}</span>
                            )}
                          </div>
                          <div className="flex gap-2 mt-2">
                            {avista ? (
                              <span className="text-[10px] font-mono bg-blue-500/10 text-blue-500 font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md">
                                À Vista
                              </span>
                            ) : (
                              <>
                                {parcelasAbertas > 0 && (
                                  <span className="text-[10px] font-mono bg-red-500/10 text-red-500 font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md">
                                    {parcelasAbertas} em aberto
                                  </span>
                                )}
                                {pagas > 0 && (
                                  <span className="text-[10px] font-mono bg-brand/10 text-brand font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md">
                                    {pagas} paga{pagas > 1 ? 's' : ''}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-ink-muted flex-shrink-0 mt-0.5">
                          {aberta ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </button>

                      {aberta && (
                        <div className="border-t border-border">
                          <div className="space-y-1 p-3">
                            {venda.parcelas.map(p => {
                              const st = statusParcela(p)
                              return (
                                <div
                                  key={p.numero}
                                  className={`space-y-2 py-2.5 px-3 rounded-xl ${p.pago ? 'bg-success/10' : 'bg-surface-2'}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => {
                                        if (!p.pago) setModalPago({ vendaId: venda.id, numeroParcela: p.numero, valor: p.valor })
                                        else {
                                          desmarcarParcelaPaga(venda.id, p.numero)
                                            .then(() => mostrarToast('Parcela desmarcada', 'info'))
                                            .catch(() => mostrarToast('Erro ao atualizar a parcela.', 'error'))
                                        }
                                      }}
                                      className="flex-shrink-0 min-h-touch min-w-touch flex items-center justify-center"
                                    >
                                      {p.pago
                                        ? <CheckCircle size={22} className="text-success" />
                                        : <Circle size={22} className="text-ink-muted" />
                                      }
                                    </button>
                                    <p className={`flex-1 min-w-0 text-sm font-medium ${p.pago ? 'text-ink-muted line-through' : 'text-ink'}`}>
                                      Parcela {p.numero}
                                    </p>
                                    {p.pago ? (
                                      <SeloPago className="flex-shrink-0" />
                                    ) : (
                                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold uppercase tracking-wide flex-shrink-0 ${st.bg} ${st.texto}`}>
                                        {st.label}
                                      </span>
                                    )}
                                    <span className={`text-sm font-mono font-semibold tabular-nums flex-shrink-0 ${p.pago ? 'text-ink-muted' : 'text-ink'}`}>
                                      {formatarMoeda(p.valor)}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between gap-1">
                                    {p.pago ? (
                                      <span className="text-xs font-mono text-ink-muted">{formatarData(p.vencimento)}</span>
                                    ) : (
                                      // O input date nativo formata a data pelo locale do aparelho
                                      // ("1 de ago. de 2026" no iOS) e isso não é estilizável. Some
                                      // com o texto dele e desenha o nosso por cima.
                                      <div className="relative">
                                        <input
                                          type="date"
                                          value={p.vencimento}
                                          aria-label={`Vencimento da parcela ${p.numero}`}
                                          onChange={e => {
                                            if (!e.target.value) return
                                            alterarVencimento(venda.id, p.numero, e.target.value)
                                              .then(() => mostrarToast('✓ Vencimento alterado'))
                                              .catch(() => mostrarToast('Erro ao alterar o vencimento.', 'error'))
                                          }}
                                          className="w-[92px] text-xs text-transparent bg-surface border border-border rounded-lg px-2 py-1.5 min-h-touch [&::-webkit-calendar-picker-indicator]:opacity-0"
                                        />
                                        <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-ink-muted pointer-events-none">
                                          {formatarData(p.vencimento)}
                                        </span>
                                      </div>
                                    )}
                                    <BotaoPix parcela={p} cliente={cliente} venda={venda} perfil={profile} />
                                    <BotaoCobranca
                                      parcela={p}
                                      cliente={cliente}
                                      venda={venda}
                                      perfil={profile}
                                      bloqueado={bloqueado}
                                      onUpgrade={abrirUpgrade}
                                      onRegistrar={async () => {
                                        try {
                                          await registrarCobranca(venda.id, p.numero)
                                          mostrarToast('✓ Cobrança registrada')
                                        } catch {
                                          mostrarToast('Erro ao registrar cobrança.', 'error')
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <div className="flex gap-2 px-3 pb-3">
                            <button
                              onClick={() => (podePdf ? gerarCarnetPDF(cliente, venda, profile || {}) : abrirUpgrade())}
                              className="flex-1 flex items-center justify-center gap-2 bg-primary-50 text-primary py-2.5 rounded-xl font-semibold text-sm active:bg-primary/10 transition-colors"
                            >
                              {podePdf ? <FileDown size={16} /> : <Lock size={16} />}
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
          </>
        ) : (
          <Timeline vendas={vendasCliente} clientes={clientes} />
        )}
      </div>

      <ModalConfirmarPagamento
        aberto={!!modalPago}
        parcela={modalPago}
        onConfirmar={confirmarMarcarPago}
        onCancelar={() => setModalPago(null)}
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
        mensagem={
          totalDevido > 0
            ? `${cliente.nome} tem ${formatarMoeda(totalDevido)} em aberto. Excluir apaga permanentemente este cliente e todo o histórico de vendas e parcelas — inclusive essa dívida.`
            : `Tem certeza que deseja excluir "${cliente.nome}"? Todo o histórico de vendas e parcelas será removido permanentemente.`
        }
        onConfirmar={confirmarExcluirCliente}
        onCancelar={() => setModalExcluirCliente(false)}
        corConfirmar="danger"
      />
    </div>
  )
}
