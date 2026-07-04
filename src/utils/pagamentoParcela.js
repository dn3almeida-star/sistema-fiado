function arredondar(n) {
  return Math.round(n * 100) / 100
}

function somarUmMes(vencimentoISO) {
  const [ano, mes, dia] = vencimentoISO.split('-').map(Number)
  return new Date(ano, mes - 1 + 1, dia).toISOString().slice(0, 10)
}

export function aplicarPagamentoParcela(parcelas, numeroParcela, valorPago, agoraISO) {
  const parcelaAlvo = parcelas.find(p => p.numero === numeroParcela)
  if (!parcelaAlvo) {
    return { parcelas: parcelas.map(p => ({ ...p })), parcelaExtraCriada: false, diferenca: 0 }
  }

  const diferenca = arredondar(parcelaAlvo.valor - valorPago)

  let novas = parcelas.map(p =>
    p.numero === numeroParcela
      ? { ...p, valor: arredondar(valorPago), pago: true, pagoEm: agoraISO }
      : { ...p }
  )

  let parcelaExtraCriada = false

  if (diferenca !== 0) {
    const proxima = novas
      .filter(p => p.numero > numeroParcela && !p.pago)
      .sort((a, b) => a.numero - b.numero)[0]

    if (proxima) {
      novas = novas.map(p =>
        p.numero === proxima.numero
          ? { ...p, valor: Math.max(0, arredondar(p.valor + diferenca)) }
          : p
      )
    } else if (diferenca > 0) {
      const maiorNumero = Math.max(...novas.map(p => p.numero))
      const maiorVencimento = novas.reduce(
        (max, p) => (p.vencimento > max ? p.vencimento : max),
        novas[0].vencimento
      )
      novas = [
        ...novas,
        {
          numero: maiorNumero + 1,
          vencimento: somarUmMes(maiorVencimento),
          valor: diferenca,
          pago: false,
          pagoEm: null,
        },
      ]
      parcelaExtraCriada = true
    }
    // diferenca < 0 e sem próxima em aberto: não faz nada (sem crédito)
  }

  return {
    parcelas: novas.sort((a, b) => a.numero - b.numero),
    parcelaExtraCriada,
    diferenca,
  }
}
