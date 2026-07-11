import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { limparNavegacaoSalva } from '../utils/navegacao.js'
import { limparComPrazo } from '../utils/armazenamentoTemporario.js'
import { CHAVE_RASCUNHO_CLIENTE, CHAVE_RASCUNHO_VENDA } from '../utils/rascunho.js'

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
      if (evt === 'SIGNED_OUT') {
        limparNavegacaoSalva()
        limparComPrazo(CHAVE_RASCUNHO_CLIENTE)
        limparComPrazo(CHAVE_RASCUNHO_VENDA)
      }
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

  // Cria a conta do lojista. O profile (com nome da loja, plano 'teste' e fim
  // do teste) nasce no banco, via trigger em auth.users — por isso o nome da
  // loja vai nos metadados do signUp, e funciona igual com a confirmação de
  // email ligada ou desligada.
  async function cadastrar(email, senha, nomeLoja, indicadoPor) {
    const dadosMeta = { nome_loja: nomeLoja.trim() }
    if (indicadoPor) dadosMeta.indicado_por = indicadoPor
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { data: dadosMeta },
    })
    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        throw new Error('Esse email já tem conta. Tente entrar.')
      }
      if (msg.includes('rate') || msg.includes('429')) {
        throw new Error('Muitas tentativas em pouco tempo. Aguarde alguns minutos.')
      }
      throw new Error('Não foi possível criar a conta. Tente novamente.')
    }
    // Com confirmação de email LIGADA, o Supabase não retorna erro para email
    // repetido: devolve um usuário "fantasma" com identities vazio.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('Esse email já tem conta. Tente entrar.')
    }
    return { precisaConfirmarEmail: !data?.session }
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
    cadastrar,
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
