import { createClient } from 'jsr:@supabase/supabase-js@2'
import { montarCorpoPagamento } from './pagamentoPix.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const mpToken = Deno.env.get('MP_ACCESS_TOKEN')!

  // Identifica o lojista pelo JWT do Supabase — nunca confia num id vindo do corpo.
  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  const user = userData?.user
  if (userErr || !user) return json({ erro: 'nao_autenticado' }, 401)

  const notificationUrl = `${supabaseUrl}/functions/v1/webhook-mercadopago`
  const corpo = montarCorpoPagamento({
    userId: user.id,
    email: user.email ?? 'sem-email@crediariodigital.app',
    notificationUrl,
  })

  try {
    const r = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(corpo),
    })
    const pag = await r.json()
    if (!r.ok) {
      console.error('MP erro', r.status, JSON.stringify(pag).slice(0, 300))
      return json({ erro: 'mp_falhou', detalhe: pag?.message ?? null }, 502)
    }
    const td = pag?.point_of_interaction?.transaction_data ?? {}
    return json({
      payment_id: String(pag.id),
      status: pag.status,
      qr_code: td.qr_code ?? null,
      qr_code_base64: td.qr_code_base64 ?? null,
      ticket_url: td.ticket_url ?? null,
    }, 200)
  } catch (err) {
    console.error('Falha ao criar pagamento:', err)
    return json({ erro: 'excecao' }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
