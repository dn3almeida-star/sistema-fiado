import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [recuperandoSenha, setRecuperandoSenha] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evt, novaSessao) => {
      setSession(novaSessao)
      if (evt === 'PASSWORD_RECOVERY') setRecuperandoSenha(true)
      else if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT') setRecuperandoSenha(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function login(email, senha) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function updatePassword(novaSenha) {
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) throw error
    setRecuperandoSenha(false)
    await supabase.auth.signOut()
  }

  const valor = {
    session,
    usuario: session?.user ?? null,
    carregando,
    recuperandoSenha,
    login,
    logout,
    updatePassword,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
