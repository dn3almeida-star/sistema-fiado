import { useMemo } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Users, BarChart2 } from 'lucide-react'
import CardResumo from '../components/CardResumo.jsx'
import EstadoVazio from '../components/EstadoVazio.jsx'
import { formatarMoeda, mesAtual, diasAteVencimento, hoje } from '../utils/formatadores.js'
import { metricasRelatorio } from '../utils/metricasRelatorio.js'
import GraficoBarras from '../components/GraficoBarras.jsx'
import BarrasHorizontais from '../components/BarrasHorizontais.jsx'
import Donut from '../components/Donut.jsx'

export default function Relatorio({ clientes, vendas }) {
  const stats = useMemo(() => {
    const mes = mesAtual()
    let totalReceber = 0
    let recebidoMes = 0
    let totalAtraso = 0
    let clientesComAtraso = new Set()
    let clientesEmDia = new Set()

    vendas.forEach(venda => {
      venda.parcelas.forEach(p => {
        if (p.pago) {
          if (p.pagoEm && p.pagoEm.startsWith(mes)) recebidoMes += p.valor
        } else {
          totalReceber += p.valor
          const dias = diasAteVencimento(p.vencimento)
          if (dias < 0) {
            totalAtraso += p.valor
            clientesComAtraso.add(venda.clienteId)
          } else {
            clientesEmDia.add(venda.clienteId)
          }
        }
      })
    })

    return {
      totalReceber,
      recebidoMes,
      totalAtraso,
      clientesComAtraso: clientesComAtraso.size,
      clientesEmDia: [...clientesEmDia].filter(id => !clientesComAtraso.has(id)).length,
    }
  }, [vendas])

  const metricas = useMemo(() => metricasRelatorio(vendas, clientes, hoje()), [vendas, clientes])

  const mesNome = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="pt-3 pb-1">
        <h1 className="text-2xl font-display font-semibold text-ink">Relatório</h1>
        <p className="text-sm font-mono text-ink-muted mt-0.5 capitalize">{mesNome}</p>
      </div>

      {vendas.length === 0 ? (
        <EstadoVazio
          icone={BarChart2}
          titulo="Sem dados ainda"
          descricao="Registre vendas para ver o relatório."
        />
      ) : (
        <>
          <div className="space-y-3">
            <CardResumo
              titulo="Total a Receber"
              valor={formatarMoeda(stats.totalReceber)}
              sub="saldo devedor total"
              icone={DollarSign}
              cor="primary"
            />
            <CardResumo
              titulo={`Recebido em ${new Date().toLocaleDateString('pt-BR', { month: 'long' })}`}
              valor={formatarMoeda(stats.recebidoMes)}
              sub="parcelas pagas no mês"
              icone={TrendingUp}
              cor="success"
            />
            <CardResumo
              titulo="Em Atraso (valor)"
              valor={formatarMoeda(stats.totalAtraso)}
              sub={`${stats.clientesComAtraso} cliente${stats.clientesComAtraso !== 1 ? 's' : ''} com atraso`}
              icone={TrendingDown}
              cor={stats.totalAtraso > 0 ? 'danger' : 'success'}
            />
            <CardResumo
              titulo="Clientes Em Dia"
              valor={stats.clientesEmDia}
              sub={`de ${clientes.length} clientes cadastrados`}
              icone={Users}
              cor="success"
            />
          </div>

          {/* Recebido por mês */}
          <div className="bg-surface rounded-2xl shadow-sm p-4">
            <h2 className="text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-widest mb-3">Recebido por mês</h2>
            <GraficoBarras dados={metricas.recebidoPorMes} cor="#154e30" destaqueIndex={5} />
          </div>

          {/* A receber por mês */}
          <div className="bg-surface rounded-2xl shadow-sm p-4">
            <h2 className="text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-widest mb-3">A receber por mês</h2>
            <GraficoBarras dados={metricas.aReceberPorMes} cor="#c97c1a" />
          </div>

          {/* Top devedores */}
          <div className="bg-surface rounded-2xl shadow-sm p-4">
            <h2 className="text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-widest mb-3">Top devedores</h2>
            {metricas.topDevedores.length > 0 ? (
              <BarrasHorizontais
                itens={metricas.topDevedores.map(d => ({ label: d.cliente.nome, valor: d.saldo }))}
                cor="#154e30"
              />
            ) : (
              <p className="text-sm text-ink-muted">Nenhum cliente devendo no momento.</p>
            )}
          </div>

          {/* Pago vs em aberto */}
          <div className="bg-surface rounded-2xl shadow-sm p-4">
            <h2 className="text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-widest mb-3">Pago vs em aberto</h2>
            <Donut pago={metricas.pagoVsAberto.pago} aberto={metricas.pagoVsAberto.aberto} />
          </div>

          {/* Resumo geral */}
          <div className="bg-surface rounded-2xl shadow-sm p-4 space-y-3">
            <h2 className="text-[11px] font-mono font-semibold text-ink-muted uppercase tracking-widest">Resumo Geral</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Total de clientes</span>
                <span className="font-mono font-semibold text-ink">{clientes.length}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Total de vendas</span>
                <span className="font-mono font-semibold text-ink">{vendas.length}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Parcelas pendentes</span>
                <span className="font-mono font-semibold text-danger tabular-nums">
                  {vendas.flatMap(v => v.parcelas).filter(p => !p.pago).length}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Parcelas quitadas</span>
                <span className="font-mono font-semibold text-success tabular-nums">
                  {vendas.flatMap(v => v.parcelas).filter(p => p.pago).length}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
