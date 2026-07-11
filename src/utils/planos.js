// Enforcement do plano (Grátis × Pago). Função pura: recebe o profile e hojeISO,
// devolve o estado efetivo e as permissões (entitlements). Sem I/O, sem React,
// sem new Date() interno — a UI é só casca que lê estas permissões.
// Modelo em gtm-sistema-fiado.md §3; spec em docs/superpowers/specs/2026-07-11-paywall.

export const LIMITE_CLIENTES_GRATIS = 20
export const PRECO_MENSAL_LABEL = 'R$ 19,90/mês'

const ENTITLEMENTS_PAGO = {
  cobranca: true,
  pdf: true,
  relatorio: true,
  clientesIlimitados: true,
  limiteClientes: null,
}

const ENTITLEMENTS_GRATIS = {
  cobranca: false,
  pdf: false,
  relatorio: false,
  clientesIlimitados: false,
  limiteClientes: LIMITE_CLIENTES_GRATIS,
}

// Estado efetivo do plano + permissões + dias restantes do teste (quando em teste).
export function statusPlano(profile, hojeISO) {
  const plano = profile?.plano
  const termina = profile?.testeTerminaEm

  if (plano === 'pago') {
    return { estado: 'pago', diasRestantesTeste: null, entitlements: ENTITLEMENTS_PAGO }
  }

  // Teste vale até o fim do dia de teste_termina_em (comparação inclusiva).
  if (plano === 'teste' && termina && hojeISO <= termina) {
    return {
      estado: 'teste',
      diasRestantesTeste: diasEntre(hojeISO, termina),
      entitlements: ENTITLEMENTS_PAGO,
    }
  }

  // Grátis explícito, teste expirado, ou qualquer valor desconhecido → grátis travado.
  return { estado: 'gratis', diasRestantesTeste: null, entitlements: ENTITLEMENTS_GRATIS }
}

// Pode cadastrar mais um cliente? Ilimitado sempre pode; senão respeita o limite.
export function podeAdicionarCliente(status, qtdAtual) {
  if (status.entitlements.clientesIlimitados) return true
  return qtdAtual < status.entitlements.limiteClientes
}

function diasEntre(aISO, bISO) {
  const a = new Date(aISO + 'T00:00:00')
  const b = new Date(bISO + 'T00:00:00')
  return Math.round((b - a) / 86400000)
}
