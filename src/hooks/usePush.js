import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY

const suportado =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

// Converte a chave VAPID (base64url) para o Uint8Array que o PushManager exige.
function base64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Gerencia o opt-in de notificação push do lojista: pede permissão, inscreve no
// PushManager e guarda a inscrição em push_subscriptions (o cron lê de lá).
export function usePush(usuario) {
  const [permissao, setPermissao] = useState(suportado ? Notification.permission : 'unsupported')
  const [inscrito, setInscrito] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  // Sincroniza o estado "inscrito" com a inscrição real do navegador.
  useEffect(() => {
    if (!suportado) return
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setInscrito(!!sub))
      .catch(() => {})
  }, [])

  const ativar = useCallback(async () => {
    if (!suportado || !usuario || ocupado) return
    setOcupado(true)
    try {
      const permiss = await Notification.requestPermission()
      setPermissao(permiss)
      if (permiss !== 'granted') return
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(VAPID_PUBLIC),
      })
      const j = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: usuario.id,
          endpoint: sub.endpoint,
          p256dh: j.keys?.p256dh,
          auth: j.keys?.auth,
        },
        { onConflict: 'endpoint' }
      )
      if (!error) setInscrito(true)
    } catch {
      // silencioso — a UI mostra o estado atual
    } finally {
      setOcupado(false)
    }
  }, [usuario, ocupado])

  const desativar = useCallback(async () => {
    if (!suportado || ocupado) return
    setOcupado(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      setInscrito(false)
    } catch {
      // silencioso
    } finally {
      setOcupado(false)
    }
  }, [ocupado])

  return { suportado, permissao, inscrito, ocupado, ativar, desativar }
}
