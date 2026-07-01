import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Plus, ChevronRight, Users, X } from 'lucide-react'
import { mascaraTelefone } from '../utils/formatadores.js'
import { staggerContainer, fadeInUp } from '../utils/motion.js'
import EstadoVazio from '../components/EstadoVazio.jsx'

const FORM_INICIAL = { nome: '', telefone: '', endereco: '', bairro: '', observacoes: '' }

export default function Clientes({ clientes, vendas, adicionarCliente, navegar, mostrarToast }) {
  const [busca, setBusca] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [erro, setErro] = useState('')

  const clientesFiltrados = clientes.filter(c => {
    const q = busca.toLowerCase()
    return (
      c.nome.toLowerCase().includes(q) ||
      (c.bairro || '').toLowerCase().includes(q) ||
      (c.endereco || '').toLowerCase().includes(q)
    )
  })

  async function salvarCliente() {
    if (!form.nome.trim()) {
      setErro('Nome é obrigatório')
      return
    }
    try {
      await adicionarCliente({ ...form, nome: form.nome.trim() })
      setForm(FORM_INICIAL)
      setMostrarForm(false)
      setErro('')
      mostrarToast('✓ Cliente salvo')
    } catch {
      mostrarToast('Erro ao salvar cliente. Tente de novo.', 'error')
    }
  }

  function debitoCliente(clienteId) {
    return vendas
      .filter(v => v.clienteId === clienteId)
      .flatMap(v => v.parcelas)
      .filter(p => !p.pago)
      .reduce((acc, p) => acc + p.valor, 0)
  }

  return (
    <div className="p-4 space-y-3 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-3 pb-1">
        <h1 className="text-2xl font-extrabold text-ink">Clientes</h1>
        <button
          onClick={() => { setMostrarForm(true); setErro('') }}
          className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl font-semibold text-sm active:bg-primary-light transition-colors min-h-touch shadow-sm"
        >
          <Plus size={18} />
          Novo
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          placeholder="Buscar por nome ou bairro..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-border rounded-2xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
        />
      </div>

      {/* Formulário de novo cliente */}
      {mostrarForm && (
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink">Novo Cliente</h2>
            <button onClick={() => { setMostrarForm(false); setErro('') }} className="text-ink-muted hover:text-ink p-1">
              <X size={20} />
            </button>
          </div>

          {erro && <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl">{erro}</p>}

          <div className="space-y-2">
            <label className="block">
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Nome *</span>
              <input
                type="text"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome completo"
                className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Telefone / WhatsApp</span>
              <input
                type="tel"
                inputMode="numeric"
                value={form.telefone}
                onChange={e => setForm(f => ({ ...f, telefone: mascaraTelefone(e.target.value) }))}
                placeholder="(00) 00000-0000"
                className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Endereço</span>
              <input
                type="text"
                value={form.endereco}
                onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
                placeholder="Rua, número, complemento"
                className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Bairro / Referência</span>
              <input
                type="text"
                value={form.bairro}
                onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))}
                placeholder="Bairro ou ponto de referência"
                className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Observações</span>
              <textarea
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Observações gerais..."
                rows={2}
                className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </label>
          </div>

          <button
            onClick={salvarCliente}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold text-base active:bg-primary-light transition-colors"
          >
            Salvar Cliente
          </button>
        </div>
      )}

      {/* Lista */}
      {clientesFiltrados.length === 0 ? (
        <div className="space-y-2">
          {busca ? (
            <div className="text-center py-12 text-ink-muted">
              <Users size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Nenhum cliente encontrado</p>
            </div>
          ) : (
            <EstadoVazio
              icone={Users}
              titulo="Nenhum cliente ainda"
              descricao="Cadastre o primeiro cliente para começar"
              acao={{ label: 'Cadastrar primeiro cliente', onClick: () => { setMostrarForm(true); setErro('') } }}
            />
          )}
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
          {clientesFiltrados.map(cliente => {
            const debito = debitoCliente(cliente.id)
            return (
              <motion.div variants={fadeInUp} key={cliente.id}>
                <button
                  onClick={() => navegar('perfil', { clienteId: cliente.id })}
                  className="w-full bg-surface rounded-2xl shadow-sm p-4 text-left flex items-center gap-3 active:bg-surface-2 transition-colors"
                >
                  <div className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-lg">{cliente.nome[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink truncate">{cliente.nome}</p>
                    {cliente.bairro && <p className="text-sm text-ink-muted truncate">{cliente.bairro}</p>}
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    {debito > 0 && (
                      <div className="text-right">
                        <span className="text-[11px] text-accent font-semibold">R$</span>
                        <span className="text-sm font-bold text-ink tabular-nums ml-0.5">
                          {debito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <ChevronRight size={16} className="text-ink-muted" />
                  </div>
                </button>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
