import { useState } from 'react'
import { KeyRound, Check } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'

export default function RedefinirSenha() {
  const { updatePassword } = useAuth()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar(e) {
    e.preventDefault()
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem'); return }
    setErro('')
    setSalvando(true)
    try {
      await updatePassword(senha)
    } catch {
      setErro('Não foi possível redefinir a senha. Tente novamente.')
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-ground">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
          <KeyRound size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">Nova senha</h1>
        <p className="text-sm text-gray-500 mt-1">Escolha uma senha segura para sua conta</p>
      </div>

      <form onSubmit={salvar} className="space-y-3">
        {erro && (
          <p className="text-sm text-danger bg-red-50 px-3 py-2 rounded-xl text-center">{erro}</p>
        )}

        <label className="block">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nova senha</span>
          <input
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="mt-1.5 w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Confirmar senha</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
            placeholder="Repita a senha"
            className="mt-1.5 w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </label>

        <button
          type="submit"
          disabled={salvando}
          className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base active:bg-primary-light transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Check size={18} />
          {salvando ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </div>
  )
}
