// Link de indicação: leva pro cadastro já com o ref do indicador. Função pura.
export function linkIndicacao(origin, userId) {
  if (!userId) return ''
  const base = String(origin).replace(/\/$/, '')
  return `${base}/cadastro?ref=${userId}`
}
