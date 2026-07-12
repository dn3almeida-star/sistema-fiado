import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { taxasFunil } from '../utils/metricas.js'

// Busca as métricas do funil via RPC (função SQL security definer que só
// responde pro fundador). Aplica as taxas (função pura) no resultado bruto.
export function useMetricas() {
  const [metricas, setMetricas] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let vivo = true
    supabase.rpc('metricas_funil').then(({ data, error }) => {
      if (!vivo) return
      if (error || !data) setErro(true)
      else setMetricas(taxasFunil(data))
      setCarregando(false)
    })
    return () => { vivo = false }
  }, [])

  return { metricas, carregando, erro }
}
