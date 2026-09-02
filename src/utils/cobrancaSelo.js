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

// Quantos dias uma cobranca recente ainda merece um "sera que ja pagou?".
// Passado isso, cobrar de novo e legitimo e o aviso so atrapalharia.
const DIAS_RECOBRANCA = 7

function diasDeCalendario(deISO, ateISO) {
  const a = new Date(deISO)
  const b = new Date(ateISO)
  const d1 = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const d2 = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((d2 - d1) / 86400000)
}

/**
 * Aviso para antes de cobrar de novo. O lojista recebe o Pix no banco e nem
 * sempre marca a parcela no app na hora — cobrar quem ja pagou queima a
 * confianca, que num fiado sem entrada e o capital do negocio.
 *
 * @returns {string|null} o texto do aviso, ou null quando nao ha o que avisar
 */
export function avisoRecobranca(parcela, agoraISO) {
  if (!parcela || parcela.pago || !parcela.ultimaCobrancaEm) return null

  const dias = diasDeCalendario(parcela.ultimaCobrancaEm, agoraISO)
  if (dias < 0 || dias > DIAS_RECOBRANCA) return null

  const quando = dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `ha ${dias} dias`
  return `Voce ja cobrou esta parcela ${quando}. Confira se ela ja foi paga antes de cobrar de novo.`
}
