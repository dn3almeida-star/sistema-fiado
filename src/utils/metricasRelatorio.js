import { resumoCliente } from './resumoCliente.js'

const MESES_ABREV = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

export function labelMes(mesISO) {
  const m = parseInt(mesISO.slice(5, 7), 10)
  return MESES_ABREV[m - 1]
}

export function deslocarMes(mesISO, n) {
  const ano = parseInt(mesISO.slice(0, 4), 10)
  const mes0 = parseInt(mesISO.slice(5, 7), 10) - 1
  const total = ano * 12 + mes0 + n
  const novoAno = Math.floor(total / 12)
  const novoMes0 = total - novoAno * 12
  return `${novoAno}-${String(novoMes0 + 1).padStart(2, '0')}`
}

export function metricasRelatorio(vendas, clientes, hojeISO) {
  const mesAtual = hojeISO.slice(0, 7)
  const parcelas = vendas.flatMap(v => v.parcelas)

  // Recebido por mês (atual + 5 anteriores, crescente)
  const mesesReceb = Array.from({ length: 6 }, (_, i) => deslocarMes(mesAtual, i - 5))
  const recebidoMap = {}
  parcelas.forEach(p => {
    if (p.pago && p.pagoEm) {
      const m = p.pagoEm.slice(0, 7)
      recebidoMap[m] = (recebidoMap[m] || 0) + (p.valor || 0)
    }
  })
  const recebidoPorMes = mesesReceb.map(m => ({ mes: m, label: labelMes(m), valor: recebidoMap[m] || 0 }))

  // A receber por mês (atual + próximos 5, crescente). Vencidas somam no mês atual.
  const mesesRec = Array.from({ length: 6 }, (_, i) => deslocarMes(mesAtual, i))
  const aReceberMap = {}
  parcelas.forEach(p => {
    if (!p.pago) {
      let m = p.vencimento.slice(0, 7)
      if (m < mesAtual) m = mesAtual
      aReceberMap[m] = (aReceberMap[m] || 0) + (p.valor || 0)
    }
  })
  const aReceberPorMes = mesesRec.map(m => ({ mes: m, label: labelMes(m), valor: aReceberMap[m] || 0 }))

  // Top devedores (até 5, desc)
  const topDevedores = clientes
    .map(c => ({ cliente: c, saldo: resumoCliente(vendas, c.id, hojeISO).saldo }))
    .filter(x => x.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 5)

  // Pago vs em aberto (todas as parcelas)
  let pago = 0, aberto = 0
  parcelas.forEach(p => {
    if (p.pago) pago += (p.valor || 0)
    else aberto += (p.valor || 0)
  })

  return { recebidoPorMes, aReceberPorMes, topDevedores, pagoVsAberto: { pago, aberto } }
}
