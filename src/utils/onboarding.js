// Progresso dos "primeiros passos" do lojista novo. Função pura (sem I/O, sem
// React): olha clientes e vendas e diz quais passos de ativação já foram dados.
// O momento "aha" do funil (gtm §5) é a 1ª cobrança enviada.
export function passosOnboarding(clientes, vendas) {
  const cadastrouCliente = clientes.length > 0
  const registrouFiado = vendas.length > 0
  const enviouCobranca = vendas.some(v =>
    v.parcelas?.some(p => !!p.ultimaCobrancaEm)
  )
  return {
    cadastrouCliente,
    registrouFiado,
    enviouCobranca,
    completo: cadastrouCliente && registrouFiado && enviouCobranca,
  }
}
