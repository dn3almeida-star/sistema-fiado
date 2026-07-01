export function resumoCliente(vendas, clienteId, hojeISO) {
  const abertas = vendas
    .filter(v => v.clienteId === clienteId)
    .flatMap(v => v.parcelas)
    .filter(p => !p.pago)

  const saldo = abertas.reduce((acc, p) => acc + (p.valor || 0), 0)
  const emAtraso = abertas.some(p => p.vencimento < hojeISO)

  let situacao
  if (saldo === 0) situacao = 'quitado'
  else if (emAtraso) situacao = 'atraso'
  else situacao = 'em_dia'

  return { saldo, emAtraso, situacao }
}
