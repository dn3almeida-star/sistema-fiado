import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

// Fluxo de assinatura via Pix (Mercado Pago). Cria o pagamento pela Edge Function
// e faz poll na tabela `pagamentos` (o webhook grava lá) até aprovar. Ao aprovar,
// chama onAprovado (recarrega o profile → o paywall libera).
export function useAssinatura(onAprovado) {
  const [pagamento, setPagamento] = useState(null) // { payment_id, qr_code, qr_code_base64 }
  const [status, setStatus] = useState('idle')      // idle | criando | aguardando | aprovado | erro
  const pollRef = useRef(null)

  const pararPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  const iniciar = useCallback(async () => {
    pararPoll()
    setStatus('criando')
    setPagamento(null)
    try {
      const { data, error } = await supabase.functions.invoke('criar-pagamento-pix')
      if (error || !data?.payment_id || !data?.qr_code) {
        setStatus('erro'); return
      }
      setPagamento(data)
      setStatus('aguardando')
    } catch {
      setStatus('erro')
    }
  }, [pararPoll])

  // Enquanto aguarda, consulta a tabela pagamentos (RLS deixa o dono ler os seus).
  useEffect(() => {
    if (status !== 'aguardando' || !pagamento?.payment_id) return
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('pagamentos').select('status').eq('id', pagamento.payment_id).maybeSingle()
      if (data?.status === 'approved') {
        pararPoll()
        setStatus('aprovado')
        onAprovado?.()
      }
    }, 4000)
    return pararPoll
  }, [status, pagamento, onAprovado, pararPoll])

  const resetar = useCallback(() => {
    pararPoll()
    setPagamento(null)
    setStatus('idle')
  }, [pararPoll])

  return { pagamento, status, iniciar, resetar }
}
