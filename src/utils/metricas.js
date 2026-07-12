// Taxas do funil a partir dos números brutos vindos da função SQL. Pura, sem I/O.
// As 5 métricas do GTM §9 (a nº1, "comentários FIADO", vive fora do app).
export function taxasFunil(m) {
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)
  return {
    ...m,
    taxaAtivacao: pct(m.ativados, m.cadastros),
    taxaPagantes: pct(m.pagantes, m.cadastros),
  }
}
