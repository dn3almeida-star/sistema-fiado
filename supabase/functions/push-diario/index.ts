import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { montarNotificacaoPush } from './resumoPush.ts'
import { dataSaoPaulo } from '../_shared/datas.ts'

// Cron diário do push: para cada lojista com inscrição, monta o resumo de
// cobranças do dia e envia uma notificação. É a versão que escala do lembrete
// (o CallMeBot só atende o dono). Autenticado pelo mesmo x-cron-secret.
Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contato@crediariodigital.app'
  const supabase = createClient(supabaseUrl, serviceKey)

  // Autenticação: segredo compartilhado guardado em public.app_config (tabela com
  // RLS e sem políticas — inacessível via API). Mesmo padrão do lembrete-diario.
  const segredo = req.headers.get('x-cron-secret') ?? ''
  const { data: cfg } = await supabase
    .from('app_config').select('valor').eq('chave', 'lembrete_cron_secret').single()
  if (!cfg?.valor || segredo !== cfg.valor) {
    return json({ ok: false, erro: 'nao_autorizado' }, 401)
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const hojeISO = dataSaoPaulo(new Date())

  const { data: subs, error } = await supabase
    .from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth')
  if (error) { console.error('Erro lendo inscrições:', error); return json({ ok: false }, 500) }

  // Agrupa inscrições por usuário (um lojista pode ter vários dispositivos).
  const porUsuario = new Map<string, typeof subs>()
  for (const s of subs ?? []) {
    const lista = porUsuario.get(s.user_id) ?? []
    lista.push(s)
    porUsuario.set(s.user_id, lista)
  }

  let enviados = 0
  let removidos = 0

  for (const [userId, lista] of porUsuario) {
    const [vendasRes, clientesRes] = await Promise.all([
      supabase.from('vendas').select('clienteId:cliente_id, parcelas').eq('user_id', userId),
      supabase.from('clientes').select('id, nome').eq('user_id', userId),
    ])
    const notif = montarNotificacaoPush(vendasRes.data ?? [], clientesRes.data ?? [], hojeISO)
    if (!notif) continue

    const payload = JSON.stringify({ titulo: notif.titulo, corpo: notif.corpo, url: '/cobrancas' })
    for (const s of lista) {
      const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }
      try {
        await webpush.sendNotification(subscription, payload)
        enviados++
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode
        // 404/410 = inscrição morta (app desinstalado, permissão revogada): limpa.
        if (code === 404 || code === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', s.id)
          removidos++
        } else {
          console.error('Falha ao enviar push:', code, err)
        }
      }
    }
  }

  return json({ ok: true, enviados, removidos }, 200)
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}
