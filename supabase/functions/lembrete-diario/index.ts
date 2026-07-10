import { createClient } from 'jsr:@supabase/supabase-js@2'
import { resumoDia, montarMensagem, dataSaoPaulo } from './resumoDia.ts'

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const ownerId = Deno.env.get('OWNER_USER_ID')!
  const phone = Deno.env.get('CALLMEBOT_PHONE')!
  const apikey = Deno.env.get('CALLMEBOT_APIKEY')!

  const supabase = createClient(supabaseUrl, serviceKey)

  // Autenticação: só o cron conhece o segredo guardado em public.app_config
  // (tabela com RLS e sem políticas — inacessível via API). A publishable key
  // sozinha (pública, vai no bundle do front) não basta mais para disparar.
  const segredoRecebido = req.headers.get('x-cron-secret') ?? ''
  const { data: cfg } = await supabase
    .from('app_config').select('valor').eq('chave', 'lembrete_cron_secret').single()
  const segredoEsperado = cfg?.valor ?? ''
  if (segredoEsperado.length === 0 || segredoRecebido !== segredoEsperado) {
    return json({ ok: false, erro: 'nao_autorizado' }, 401)
  }

  const hojeISO = dataSaoPaulo(new Date())

  const [vendasRes, clientesRes] = await Promise.all([
    supabase.from('vendas').select('clienteId:cliente_id, parcelas').eq('user_id', ownerId),
    supabase.from('clientes').select('id, nome, telefone').eq('user_id', ownerId),
  ])

  if (vendasRes.error || clientesRes.error) {
    console.error('Erro ao ler dados:', vendasRes.error ?? clientesRes.error)
    return json({ ok: false, erro: 'query' }, 500)
  }

  const resumo = resumoDia(vendasRes.data ?? [], clientesRes.data ?? [], hojeISO)
  if (resumo.vazio) {
    return json({ ok: true, enviado: false, motivo: 'fila vazia' }, 200)
  }

  const mensagem = montarMensagem(resumo)
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(mensagem)}&apikey=${encodeURIComponent(apikey)}`
  try {
    const r = await fetch(url)
    console.log('CallMeBot status', r.status, (await r.text()).slice(0, 200))
  } catch (err) {
    console.error('CallMeBot falhou:', err)
  }
  return json({ ok: true, enviado: true }, 200)
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
