import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useProfile(usuario) {
  const [profile, setProfile] = useState(null)
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    if (!usuario) {
      setProfile(null)
      setCarregando(false)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, nome_loja, telefone, logo_url, chave_pix, cidade, plano, testeTerminaEm:teste_termina_em, planoExpiraEm:plano_expira_em')
      .eq('id', usuario.id)
      .maybeSingle()
    setProfile(data ?? null)
    setCarregando(false)
  }, [usuario])

  useEffect(() => {
    setCarregando(true)
    recarregar()
  }, [recarregar])

  async function salvarProfile(dados) {
    const payload = { id: usuario.id, ...dados }
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload)
      .select('id, nome_loja, telefone, logo_url, chave_pix, cidade, plano, testeTerminaEm:teste_termina_em, planoExpiraEm:plano_expira_em')
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }

  async function enviarLogo(file) {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const caminho = `${usuario.id}/logo.${ext}`
    const { error } = await supabase.storage
      .from('logos')
      .upload(caminho, file, { upsert: true, contentType: file.type })
    if (error) throw error
    const { data } = supabase.storage.from('logos').getPublicUrl(caminho)
    const url = `${data.publicUrl}?t=${Date.now()}`
    await salvarProfile({ logo_url: url })
    return url
  }

  return { profile, carregandoProfile: carregando, salvarProfile, enviarLogo, recarregarProfile: recarregar }
}
