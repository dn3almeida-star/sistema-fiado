import { useState, useMemo } from 'react'
import { ArrowLeft, Search, Check } from 'lucide-react'
import { calcularParcelas } from '../utils/calcularParcelas.js'
import { criarParcelaAvista } from '../utils/vendaAvista.js'
import { formatarMoeda, formatarData, hoje } from '../utils/formatadores.js'
import { haptic } from '../utils/haptic.js'

export default function NovaVenda({ clientes, adicionarVenda, clientePreSelecionado, navegar }) {
  const [etapa, setEtapa] = useState(clientePreSelecionado ? 2 : 1)
  const [clienteId, setClienteId] = useState(clientePreSelecionado || '')
  const [buscaCliente, setBuscaCliente] = useState('')
  const [modo, setModo] = useState('fiado') // 'fiado' | 'avista'
  const [form, setForm] = useState({
    itens: '',
    valorTotal: '',
    entrada: '',
    numeroParcelas: '1',
    dataPrimeiraParcela: hoje(),
  })
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const clienteSelecionado = clientes.find(c => c.id === clienteId)

  const clientesFiltrados = clientes.filter(c => {
    const q = buscaCliente.toLowerCase()
    return c.nome.toLowerCase().includes(q) || (c.bairro || '').toLowerCase().includes(q)
  })

  const parcelasPreview = useMemo(() => {
    if (modo !== 'fiado') return []
    const total = parseFloat(form.valorTotal) || 0
    const entrada = parseFloat(form.entrada) || 0
    const nparcelas = parseInt(form.numeroParcelas) || 1
    if (total <= 0 || !form.dataPrimeiraParcela) return []
    return calcularParcelas(total, entrada, nparcelas, form.dataPrimeiraParcela)
  }, [modo, form.valorTotal, form.entrada, form.numeroParcelas, form.dataPrimeiraParcela])

  function validar() {
    if (!clienteId)                        { setErro('Selecione um cliente');                 return false }
    if (!form.itens.trim())                { setErro('Descreva os itens da venda');           return false }
    const total = parseFloat(form.valorTotal)
    if (!total || total <= 0)              { setErro('Informe o valor total');                return false }

    if (modo === 'avista') {
      setErro('')
      return true
    }

    const entrada = parseFloat(form.entrada) || 0
    if (entrada > total)                   { setErro('Entrada não pode ser maior que o total'); return false }
    const nparcelas = parseInt(form.numeroParcelas)
    if (!nparcelas || nparcelas < 1)       { setErro('Número de parcelas inválido');          return false }
    if (!form.dataPrimeiraParcela)         { setErro('Informe a data da primeira parcela');   return false }
    setErro('')
    return true
  }

  async function salvar() {
    if (!validar()) return
    try {
      const total = parseFloat(form.valorTotal)
      const dados = modo === 'avista'
        ? {
            clienteId,
            itens: form.itens.trim(),
            valorTotal: total,
            entrada: 0,
            parcelas: [criarParcelaAvista(total, hoje())],
          }
        : {
            clienteId,
            itens: form.itens.trim(),
            valorTotal: total,
            entrada: parseFloat(form.entrada) || 0,
            parcelas: parcelasPreview,
          }
      await adicionarVenda(dados)
      haptic()
      setSucesso(true)
      setTimeout(() => navegar('perfil', { clienteId }), 1200)
    } catch {
      setErro('Erro ao salvar a venda. Verifique a conexão e tente de novo.')
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
          <Check size={32} className="text-success" />
        </div>
        <p className="text-xl font-bold text-ink">Venda registrada!</p>
        <p className="text-sm text-ink-muted text-center">Redirecionando para o perfil do cliente…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <div className="bg-primary text-white px-4 pt-4 pb-5">
        <button
          onClick={() => navegar('dashboard')}
          className="flex items-center gap-2 text-white/70 mb-3 min-h-touch transition-colors hover:text-white"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Cancelar</span>
        </button>
        <h1 className="text-xl font-bold">Nova Venda</h1>

        {/* Progresso */}
        <div className="flex gap-2 mt-3">
          {[1, 2].map(n => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full transition-colors ${etapa >= n ? 'bg-white' : 'bg-white/25'}`}
            />
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Etapa 1: Selecionar cliente */}
        {etapa === 1 && (
          <div className="space-y-3">
            <h2 className="font-bold text-ink">Selecionar Cliente</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Buscar cliente…"
                value={buscaCliente}
                onChange={e => setBuscaCliente(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-border rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface shadow-sm"
              />
            </div>

            <div className="space-y-2">
              {clientesFiltrados.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setClienteId(c.id); setEtapa(2) }}
                  className="w-full bg-surface rounded-2xl shadow-sm p-4 text-left flex items-center gap-3 active:bg-primary-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">{c.nome[0]?.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{c.nome}</p>
                    {c.bairro && <p className="text-sm text-ink-muted">{c.bairro}</p>}
                  </div>
                </button>
              ))}
              {clientesFiltrados.length === 0 && (
                <p className="text-center text-ink-muted py-6 text-sm">Nenhum cliente encontrado</p>
              )}
            </div>
          </div>
        )}

        {/* Etapa 2: Dados da venda */}
        {etapa === 2 && (
          <div className="space-y-4">
            {/* Cliente selecionado */}
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-primary font-semibold uppercase tracking-wide">Cliente</p>
                <p className="font-bold text-ink mt-0.5">{clienteSelecionado?.nome}</p>
              </div>
              {!clientePreSelecionado && (
                <button onClick={() => setEtapa(1)} className="text-sm text-primary font-semibold underline underline-offset-2">
                  Trocar
                </button>
              )}
            </div>

            {/* Toggle Fiado / À Vista */}
            <div className="flex gap-2 bg-surface-2 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setModo('fiado')}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  modo === 'fiado' ? 'bg-primary text-white shadow-sm' : 'text-ink-muted'
                }`}
              >
                Fiado
              </button>
              <button
                type="button"
                onClick={() => setModo('avista')}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  modo === 'avista' ? 'bg-primary text-white shadow-sm' : 'text-ink-muted'
                }`}
              >
                À Vista
              </button>
            </div>

            {erro && <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl">{erro}</p>}

            {/* Formulário */}
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Itens / Descrição *</span>
                <textarea
                  value={form.itens}
                  onChange={e => setForm(f => ({ ...f, itens: e.target.value }))}
                  placeholder="Ex: Jogo de panelas 5 peças, conjunto de lençol…"
                  rows={3}
                  className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </label>

              {(() => {
                const campoValorTotal = (
                  <label className="block">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Valor Total (R$) *</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={form.valorTotal}
                      onChange={e => setForm(f => ({ ...f, valorTotal: e.target.value }))}
                      placeholder="0,00"
                      className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary tabular-nums"
                    />
                  </label>
                )

                if (modo !== 'fiado') return campoValorTotal

                return (
                  <div className="grid grid-cols-2 gap-3">
                    {campoValorTotal}
                    <label className="block">
                      <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Entrada (R$)</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={form.entrada}
                        onChange={e => setForm(f => ({ ...f, entrada: e.target.value }))}
                        placeholder="0,00"
                        className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary tabular-nums"
                      />
                    </label>
                  </div>
                )
              })()}

              {modo === 'fiado' && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Nº de Parcelas *</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="60"
                      value={form.numeroParcelas}
                      onChange={e => setForm(f => ({ ...f, numeroParcelas: e.target.value }))}
                      className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary tabular-nums"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">1ª Parcela em *</span>
                    <input
                      type="date"
                      value={form.dataPrimeiraParcela}
                      onChange={e => setForm(f => ({ ...f, dataPrimeiraParcela: e.target.value }))}
                      className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Preview de parcelas */}
            {modo === 'fiado' && parcelasPreview.length > 0 && (
              <div className="bg-surface rounded-2xl shadow-sm p-4">
                <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">Preview das Parcelas</p>
                <div className="space-y-2">
                  {parcelasPreview.map(p => (
                    <div key={p.numero} className="flex justify-between items-center text-sm">
                      <span className="text-ink-muted font-medium">Parcela {p.numero}</span>
                      <span className="text-ink-muted">{formatarData(p.vencimento)}</span>
                      <span className="font-bold text-ink tabular-nums">{formatarMoeda(p.valor)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex justify-between text-sm">
                  <span className="text-ink-muted font-medium">Total parcelado</span>
                  <div>
                    <span className="text-accent text-xs font-semibold">R$ </span>
                    <span className="font-bold text-primary tabular-nums">
                      {parcelasPreview.reduce((a, p) => a + p.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={salvar}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base active:bg-primary-light transition-colors shadow-sm"
            >
              Salvar Venda
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
