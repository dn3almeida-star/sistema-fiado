import { useState } from 'react'
import { KeyRound, Check, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'

export default function RedefinirSenha() {
  const { updatePassword } = useAuth()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [verConfirmar, setVerConfirmar] = useState(false)

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
        <h1 className="text-2xl font-extrabold text-ink">Nova senha</h1>
        <p className="text-sm text-ink-muted mt-1">Escolha uma senha segura para sua conta</p>
      </div>

      <form onSubmit={salvar} className="space-y-3">
        {erro && (
          <p className="text-sm text-danger bg-red-50 px-3 py-2 rounded-xl text-center">{erro}</p>
        )}

        <label className="block">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Nova senha</span>
          <div className="relative mt-1.5">
            <input
              type={verSenha ? 'text' : 'password'}
              autoComplete="new-password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
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

        <label className="block">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Confirmar senha</span>
          <div className="relative mt-1.5">
            <input
              type={verConfirmar ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repita a senha"
              className="w-full px-4 py-3 pr-12 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setVerConfirmar(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1"
            >
              {verConfirmar ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
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
