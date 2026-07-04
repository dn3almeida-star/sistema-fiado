// Monta a fila de cobrança do dia: parcelas não pagas, vencidas ou vencendo hoje,
// de clientes com telefone. Ordena por urgência. Função pura (recebe hoje/agora).
export function construirFilaCobranca(vendas, clientes, hojeISO, agoraISO) {
  const itens = []
  vendas.forEach(venda => {
    venda.parcelas.forEach(parcela => {
      if (parcela.pago) return
      if (parcela.vencimento > hojeISO) return // só atrasadas + vencendo hoje
      const cliente = clientes.find(c => c.id === venda.clienteId)
      if (!cliente || !cliente.telefone) return // sem telefone não dá pra cobrar
      itens.push({
        cliente,
        parcela,
        venda,
        diasAtraso: diasEntre(parcela.vencimento, hojeISO),
        jaCobradoHoje: cobradoNoDia(parcela.ultimaCobrancaEm, agoraISO),
      })
    })
  })
  return itens.sort(ordenar)
}

function ordenar(a, b) {
  if (a.jaCobradoHoje !== b.jaCobradoHoje) return a.jaCobradoHoje ? 1 : -1
  if (b.diasAtraso !== a.diasAtraso) return b.diasAtraso - a.diasAtraso
  const ta = a.parcela.ultimaCobrancaEm ? Date.parse(a.parcela.ultimaCobrancaEm) : 0
  const tb = b.parcela.ultimaCobrancaEm ? Date.parse(b.parcela.ultimaCobrancaEm) : 0
  if (ta !== tb) return ta - tb
  return a.cliente.nome.localeCompare(b.cliente.nome)
}

function diasEntre(vencimentoISO, hojeISO) {
  const v = new Date(vencimentoISO + 'T00:00:00')
  const h = new Date(hojeISO + 'T00:00:00')
  return Math.round((h - v) / 86400000)
}

function cobradoNoDia(ultimaCobrancaEm, agoraISO) {
  if (!ultimaCobrancaEm) return false
  const c = new Date(ultimaCobrancaEm)
  const a = new Date(agoraISO)
  return c.getFullYear() === a.getFullYear() && c.getMonth() === a.getMonth() && c.getDate() === a.getDate()
}
