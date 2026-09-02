function arredondar(n) {
  return Math.round(n * 100) / 100
}

function somarUmMes(vencimentoISO) {
  const [ano, mes, dia] = vencimentoISO.split('-').map(Number)
  const d = new Date(ano, mes - 1 + 1, dia)
  const anoNovo = d.getFullYear()
  const mesNovo = String(d.getMonth() + 1).padStart(2, '0')
  const diaNovo = String(d.getDate()).padStart(2, '0')
  return `${anoNovo}-${mesNovo}-${diaNovo}`
}

// Quando o valor pago difere do valor da parcela, a diferenca e repassada pra
// proxima parcela em aberto (ou vira parcela nova, se nao houver proxima). Pra
// "desmarcar" conseguir desfazer isso depois, a parcela paga guarda de onde
// veio (valorOriginal) e pra onde foi o ajuste (ajuste: {numero, valor,
// criouParcela}) — o valor real aplicado, nao a diferenca bruta, porque o
// clamp em 0 pode fazer os dois nao baterem.
export function aplicarPagamentoParcela(parcelas, numeroParcela, valorPago, agoraISO) {
  const parcelaAlvo = parcelas.find(p => p.numero === numeroParcela)
  if (!parcelaAlvo) {
    return { parcelas: parcelas.map(p => ({ ...p })), parcelaExtraCriada: false, diferenca: 0 }
  }

  const diferenca = arredondar(parcelaAlvo.valor - valorPago)

  let novas = parcelas.map(p =>
    p.numero === numeroParcela
      ? {
          ...p,
          valor: arredondar(valorPago),
          pago: true,
          pagoEm: agoraISO,
          ...(diferenca !== 0 ? { valorOriginal: p.valor } : {}),
        }
      : { ...p }
  )

  let parcelaExtraCriada = false

  if (diferenca !== 0) {
    const proxima = novas
      .filter(p => p.numero > numeroParcela && !p.pago)
      .sort((a, b) => a.numero - b.numero)[0]

    if (proxima) {
      const novoValorProxima = Math.max(0, arredondar(proxima.valor + diferenca))
      const valorAplicado = arredondar(novoValorProxima - proxima.valor)
      novas = novas.map(p =>
        p.numero === numeroParcela
          ? {
              ...p,
              ajuste: { numero: proxima.numero, valor: valorAplicado, valorEsperado: novoValorProxima, criouParcela: false },
            }
          : p.numero === proxima.numero
            ? { ...p, valor: novoValorProxima }
            : p
      )
    } else if (diferenca > 0) {
      const maiorNumero = Math.max(...novas.map(p => p.numero))
      const maiorVencimento = novas.reduce(
        (max, p) => (p.vencimento > max ? p.vencimento : max),
        novas[0].vencimento
      )
      const numeroExtra = maiorNumero + 1
      novas = novas.map(p =>
        p.numero === numeroParcela
          ? { ...p, ajuste: { numero: numeroExtra, valor: diferenca, valorEsperado: diferenca, criouParcela: true } }
          : p
      )
      novas = [
        ...novas,
        {
          numero: numeroExtra,
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

/**
 * Desfaz o que aplicarPagamentoParcela fez: volta a parcela ao valor de antes
 * e reverte (ou remove) a parcela que absorveu a diferenca. Se essa outra
 * parcela ja foi paga ou mudou nesse meio tempo, nao mexe nela — so reverte a
 * parcela alvo, pra nao arriscar corromper um pagamento real.
 */
export function desfazerPagamentoParcela(parcelas, numeroParcela) {
  const alvo = parcelas.find(p => p.numero === numeroParcela)
  if (!alvo) {
    return { parcelas: parcelas.map(p => ({ ...p })), parcelaRemovida: false, diferencaRevertida: 0 }
  }

  const { valorOriginal, ajuste, ...resto } = alvo

  if (valorOriginal === undefined) {
    return {
      parcelas: parcelas.map(p =>
        p.numero === numeroParcela ? { ...p, pago: false, pagoEm: null } : { ...p }
      ),
      parcelaRemovida: false,
      diferencaRevertida: 0,
    }
  }

  let novas = parcelas
    .map(p => ({ ...p }))
    .map(p => (p.numero === numeroParcela ? { ...resto, valor: valorOriginal, pago: false, pagoEm: null } : p))

  let parcelaRemovida = false
  let diferencaRevertida = 0

  if (ajuste) {
    const ajustada = novas.find(p => p.numero === ajuste.numero)
    // so reverte se a parcela ajustada ainda esta exatamente como o ajuste a
    // deixou (nao paga, valor intocado) — senao arriscaria desfazer um
    // pagamento ou edicao real que aconteceu depois
    if (ajustada && !ajustada.pago && ajustada.valor === ajuste.valorEsperado) {
      if (ajuste.criouParcela) {
        novas = novas.filter(p => p.numero !== ajuste.numero)
        parcelaRemovida = true
        diferencaRevertida = ajuste.valor
      } else {
        novas = novas.map(p =>
          p.numero === ajuste.numero ? { ...p, valor: arredondar(p.valor - ajuste.valor) } : p
        )
      }
    }
  }

  return { parcelas: novas.sort((a, b) => a.numero - b.numero), parcelaRemovida, diferencaRevertida }
}
