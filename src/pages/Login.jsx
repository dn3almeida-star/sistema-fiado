import { useState } from 'react'
import { BookOpen, LogIn, Mail, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resetEnviado, setResetEnviado] = useState(false)
  const [enviandoReset, setEnviandoReset] = useState(false)
  const [verSenha, setVerSenha] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    if (!email.trim() || !senha) {
      setErro('Informe email e senha')
      return
    }
    setEnviando(true)
    try {
      await login(email, senha)
    } catch {
      setErro('Email ou senha incorretos')
      setEnviando(false)
    }
  }

  async function esqueceiSenha() {
    if (!email.trim()) {
      setErro('Digite seu email acima antes de redefinir a senha')
      return
    }
    setErro('')
    setEnviandoReset(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/`,
      })
      if (error) throw error
      setResetEnviado(true)
    } catch (err) {
      const msg = err?.message ?? ''
      if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('429')) {
        setErro('Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.')
      } else {
        setErro('Não foi possível enviar o email. Verifique o endereço e tente novamente.')
      }
    } finally {
      setEnviandoReset(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-ground">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-sm">
          <BookOpen size={30} className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-ink">Crediário Digital</h1>
        <p className="text-sm text-ink-muted mt-1">Entre para acessar seus clientes</p>
      </div>

      {resetEnviado ? (
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Mail size={26} className="text-green-600" />
          </div>
          <div>
            <p className="font-bold text-ink">Email enviado!</p>
            <p className="text-sm text-ink-muted mt-1">Verifique sua caixa de entrada em <span className="font-semibold">{email}</span> e clique no link para redefinir sua senha.</p>
          </div>
          <button
            onClick={() => setResetEnviado(false)}
            className="text-sm text-primary font-semibold underline"
          >
            Voltar ao login
          </button>
        </div>
      ) : (
        <form onSubmit={entrar} className="space-y-3">
          {erro && (
            <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl text-center">{erro}</p>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Senha</span>
            <div className="relative mt-1.5">
              <input
                type={verSenha ? 'text' : 'password'}
                autoComplete="current-password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-12 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setVerSenha(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1"
              >
                {verSenha ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base active:bg-primary-light transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <LogIn size={18} />
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={esqueceiSenha}
              disabled={enviandoReset}
              className="text-sm text-ink-muted hover:text-primary transition-colors disabled:opacity-50"
            >
              {enviandoReset ? 'Enviando…' : 'Esqueci minha senha'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
