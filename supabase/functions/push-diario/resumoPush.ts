// Resumo do dia para a notificação push, por lojista. Função pura (recebe a
// data), sem I/O — testável com Vitest. Espelha a regra de atraso do app e do
// lembrete-diario: parcela não paga com vencimento <= hoje, de cliente existente.

export interface ParcelaPush { vencimento: string; valor: number; pago: boolean }
export interface VendaPush { clienteId: string; parcelas: ParcelaPush[] }
export interface ClientePush { id: string; nome: string }
export interface NotificacaoPush { titulo: string; corpo: string; qtd: number; total: number }

export function montarNotificacaoPush(
  vendas: VendaPush[],
  clientes: ClientePush[],
  hojeISO: string,
): NotificacaoPush | null {
  let qtd = 0
  let total = 0
  for (const venda of vendas) {
    const cliente = clientes.find((c) => c.id === venda.clienteId)
    if (!cliente) continue
    for (const parcela of venda.parcelas) {
      if (parcela.pago) continue
      if (parcela.vencimento > hojeISO) continue
      qtd += 1
      total += parcela.valor
    }
  }

  if (qtd === 0) return null

  total = Math.round(total * 100) / 100
  const totalFmt = 'R$ ' + total.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return {
    qtd,
    total,
    titulo: qtd === 1 ? '1 cobrança hoje' : `${qtd} cobranças hoje`,
    corpo: `${totalFmt} pra receber. Toque pra cobrar no WhatsApp.`,
  }
}
