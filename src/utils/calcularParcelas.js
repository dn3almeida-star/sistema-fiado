/**
 * Calcula as parcelas de uma venda.
 * A última parcela absorve o centavo de arredondamento.
 */
export function calcularParcelas(valorTotal, entrada, numParcelas, dataPrimeira) {
  const saldo = valorTotal - entrada
  if (saldo <= 0 || numParcelas < 1) return []

  const valorBase = Math.floor((saldo / numParcelas) * 100) / 100
  const soma = valorBase * (numParcelas - 1)
  const ultimoValor = Math.round((saldo - soma) * 100) / 100

  const [ano, mes, dia] = dataPrimeira.split('-').map(Number)

  return Array.from({ length: numParcelas }, (_, i) => ({
    numero: i + 1,
    vencimento: dataVencimento(ano, mes - 1 + i, dia),
    valor: i === numParcelas - 1 ? ultimoValor : valorBase,
    pago: false,
    pagoEm: null,
  }))
}

// Monta 'YYYY-MM-DD' local, normalizando o mês (índice pode passar de 11) e
// fixando o dia ao último dia do mês-alvo quando o dia original não existe.
function dataVencimento(ano, mesIndex, dia) {
  const anoAlvo = ano + Math.floor(mesIndex / 12)
  const mesAlvo = ((mesIndex % 12) + 12) % 12 // 0–11
  const ultimoDia = new Date(anoAlvo, mesAlvo + 1, 0).getDate()
  const diaAlvo = Math.min(dia, ultimoDia)
  const mm = String(mesAlvo + 1).padStart(2, '0')
  const dd = String(diaAlvo).padStart(2, '0')
  return `${anoAlvo}-${mm}-${dd}`
}
