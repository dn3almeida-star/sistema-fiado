// Rótulo curto de "quando foi a última cobrança" para o cartão de cobrança.
// Compara por dia de calendário local (ignora horas).
export function rotuloUltimaCobranca(ultimaCobrancaEm, agoraISO) {
  if (!ultimaCobrancaEm) return null
  const c = new Date(ultimaCobrancaEm)
  const a = new Date(agoraISO)
  const d1 = new Date(c.getFullYear(), c.getMonth(), c.getDate())
  const d2 = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const dias = Math.round((d2 - d1) / 86400000)
  if (dias <= 0) return 'Cobrado hoje'
  if (dias === 1) return 'Cobrado ontem'
  return `Cobrado há ${dias}d`
}
