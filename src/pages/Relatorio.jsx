import { useMemo } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Users, BarChart2 } from 'lucide-react'
import CardResumo from '../components/CardResumo.jsx'
import EstadoVazio from '../components/EstadoVazio.jsx'
import { formatarMoeda, mesAtual, diasAteVencimento } from '../utils/formatadores.js'

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

  const mesNome = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="pt-3 pb-1">
        <h1 className="text-2xl font-extrabold text-ink">Relatório</h1>
        <p className="text-sm text-ink-muted mt-0.5 capitalize">{mesNome}</p>
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

          {/* Resumo geral */}
          <div className="bg-surface rounded-2xl shadow-sm p-4 space-y-3">
            <h2 className="font-bold text-ink">Resumo Geral</h2>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Total de clientes</span>
                <span className="font-bold text-ink">{clientes.length}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Total de vendas</span>
                <span className="font-bold text-ink">{vendas.length}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Parcelas pendentes</span>
                <span className="font-bold text-danger tabular-nums">
                  {vendas.flatMap(v => v.parcelas).filter(p => !p.pago).length}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-ink-muted">Parcelas quitadas</span>
                <span className="font-bold text-success tabular-nums">
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
