// Total já recebido (parcelas pagas) — o "valor recuperado" que o app ajudou a
// cobrar. É o argumento de conversão do funil (gtm §5.3: "o app se paga").
// Função pura, sem I/O.
export function totalRecebido(vendas) {
  let total = 0
  for (const v of vendas) {
    for (const p of v.parcelas ?? []) {
      if (p.pago) total += p.valor
    }
  }
  return Math.round(total * 100) / 100
}
