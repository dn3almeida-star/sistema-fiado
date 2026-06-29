import { useState } from 'react'
import { BookOpen, LogIn } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

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
      // sucesso: o porteiro em App.jsx troca a tela automaticamente
    } catch {
      setErro('Email ou senha incorretos')
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-ground">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-sm">
          <BookOpen size={30} className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">Caderno Digital</h1>
        <p className="text-sm text-gray-500 mt-1">Entre para acessar seus clientes</p>
      </div>

      <form onSubmit={entrar} className="space-y-3">
        {erro && (
          <p className="text-sm text-danger bg-red-50 px-3 py-2 rounded-xl text-center">{erro}</p>
        )}

        <label className="block">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="mt-1.5 w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder="••••••••"
            className="mt-1.5 w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </label>

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base active:bg-primary-light transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <LogIn size={18} />
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
