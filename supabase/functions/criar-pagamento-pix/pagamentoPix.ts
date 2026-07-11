// Lógica pura do pagamento Pix (Mercado Pago). Sem I/O — testável com Vitest via
// pagamentoPix.test.js. As Edge Functions (index.ts) fazem o fetch usando estas.

export const VALOR_ASSINATURA = 19.90

// Monta o corpo do POST /v1/payments do Mercado Pago para um Pix.
// external_reference = user_id: é assim que o webhook sabe de quem é o pagamento.
export function montarCorpoPagamento(
  { userId, email, valor = VALOR_ASSINATURA, notificationUrl }:
  { userId: string; email: string; valor?: number; notificationUrl?: string }
) {
  const corpo: Record<string, unknown> = {
    transaction_amount: valor,
    description: 'Assinatura Crediário Digital — 30 dias',
    payment_method_id: 'pix',
    payer: { email },
    external_reference: userId,
  }
  if (notificationUrl) corpo.notification_url = notificationUrl
  return corpo
}
