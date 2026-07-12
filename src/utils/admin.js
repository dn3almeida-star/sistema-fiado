// Conta do fundador (dono do negócio). Não é segredo — só decide quem vê o
// painel de métricas. A trava de verdade é na função SQL metricas_funil().
export const ID_FUNDADOR = 'c69e3937-9855-4b67-ae51-868e3676fdb2'

export function ehFundador(usuario) {
  return usuario?.id === ID_FUNDADOR
}
