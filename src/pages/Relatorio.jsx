import { useMemo } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react'
import CardResumo from '../components/CardResumo.jsx'
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
        <h1 className="text-2xl font-extrabold text-gray-900">Relatório</h1>
        <p className="text-sm text-gray-500 mt-0.5 capitalize">{mesNome}</p>
      </div>

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
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="font-bold text-gray-900">Resumo Geral</h2>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Total de clientes</span>
            <span className="font-bold text-gray-900">{clientes.length}</span>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Total de vendas</span>
            <span className="font-bold text-gray-900">{vendas.length}</span>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Parcelas pendentes</span>
            <span className="font-bold text-danger tabular-nums">
              {vendas.flatMap(v => v.parcelas).filter(p => !p.pago).length}
            </span>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Parcelas quitadas</span>
            <span className="font-bold text-success tabular-nums">
              {vendas.flatMap(v => v.parcelas).filter(p => p.pago).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
