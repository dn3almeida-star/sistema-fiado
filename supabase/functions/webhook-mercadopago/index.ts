import { createClient } from 'jsr:@supabase/supabase-js@2'
import { dataSaoPaulo, calcularExpiracao } from '../_shared/datas.ts'

// Webhook do Mercado Pago. MP não manda JWT (verify_jwt=false); a segurança vem
// de reconsultar o pagamento na API do MP pelo id (não confiamos no corpo).
Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const mpToken = Deno.env.get('MP_ACCESS_TOKEN')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // O id do pagamento vem no corpo (data.id) ou na query (?data.id= / ?id=).
  const url = new URL(req.url)
  let tipo = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? ''
  let id = url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? ''
  try {
    const body = await req.json()
    tipo = body?.type ?? body?.topic ?? tipo
    id = String(body?.data?.id ?? body?.id ?? id)
  } catch { /* corpo pode vir vazio; usa a query */ }

  // Só nos interessa notificação de pagamento.
  if (tipo && tipo !== 'payment') return ok()
  if (!id) return ok()

  // Reconsulta o pagamento no MP — fonte da verdade.
  let pag: any
  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { 'Authorization': `Bearer ${mpToken}` },
    })
    if (!r.ok) { console.error('MP consulta falhou', r.status); return ok() }
    pag = await r.json()
  } catch (err) {
    console.error('Erro ao consultar MP:', err)
    return ok()
  }

  const userId = pag?.external_reference
  const status = pag?.status
  const valor = pag?.transaction_amount
  if (!userId) return ok()

  // Idempotência: se já registramos este pagamento como aprovado, não reprocessa
  // (evita estender a validade a cada reentrega do webhook).
  const { data: existente } = await supabase
    .from('pagamentos').select('status').eq('id', String(id)).maybeSingle()
  if (existente?.status === 'approved') return ok()

  await supabase.from('pagamentos').upsert({
    id: String(id), user_id: userId, valor: valor ?? 0, status: status ?? 'unknown',
  })

  if (status === 'approved') {
    const hojeISO = dataSaoPaulo(new Date())
    const expira = calcularExpiracao(hojeISO)
    const { error } = await supabase
      .from('profiles')
      .update({ plano: 'pago', plano_expira_em: expira })
      .eq('id', userId)
    if (error) { console.error('Erro ao liberar plano:', error); return json({ ok: false }, 500) }
    console.log(`Plano liberado para ${userId} até ${expira}`)

    await creditarIndicador(supabase, userId, hojeISO)
  }

  return ok()
})

// Recompensa da indicação (gtm §4): quando o indicado paga pela 1ª vez, o
// indicador ganha +30 dias. Nunca rebaixa quem é pago permanente (expira null).
// Idempotente: marca indicacao_creditada no indicado pra creditar uma só vez.
async function creditarIndicador(supabase: any, indicadoId: string, hojeISO: string) {
  const { data: indicado } = await supabase
    .from('profiles').select('indicado_por, indicacao_creditada').eq('id', indicadoId).maybeSingle()
  const indicadorId = indicado?.indicado_por
  if (!indicadorId || indicado?.indicacao_creditada) return

  const { data: indicador } = await supabase
    .from('profiles').select('plano, plano_expira_em').eq('id', indicadorId).maybeSingle()
  if (!indicador) return

  // Pago permanente não precisa da recompensa; só fecha a indicação.
  const permanente = indicador.plano === 'pago' && !indicador.plano_expira_em
  if (!permanente) {
    const base = indicador.plano_expira_em && indicador.plano_expira_em > hojeISO
      ? indicador.plano_expira_em : hojeISO
    const novoExpira = calcularExpiracao(base)
    await supabase.from('profiles')
      .update({ plano: 'pago', plano_expira_em: novoExpira }).eq('id', indicadorId)
    console.log(`Indicador ${indicadorId} recompensado até ${novoExpira}`)
  }
  await supabase.from('profiles')
    .update({ indicacao_creditada: true }).eq('id', indicadoId)
}

function ok(): Response {
  return json({ ok: true }, 200)
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}
