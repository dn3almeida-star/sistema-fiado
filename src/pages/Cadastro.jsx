import { useState } from 'react'
import { UserPlus, Mail, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { validarCadastro, calcularFimTeste } from '../utils/cadastro.js'

function hojeISOSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

function formatarDataBR(iso) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export default function Cadastro({ aoIrParaLogin }) {
  const { cadastrar } = useAuth()
  const [nomeLoja, setNomeLoja] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erros, setErros] = useState({})
  const [erroGeral, setErroGeral] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aguardandoEmail, setAguardandoEmail] = useState(false)
  const [verSenha, setVerSenha] = useState(false)

  const fimTeste = formatarDataBR(calcularFimTeste(hojeISOSaoPaulo()))

  async function criarConta(e) {
    e.preventDefault()
    setErroGeral('')
    const { valido, erros: novosErros } = validarCadastro({ nomeLoja, email, senha, confirmarSenha })
    setErros(novosErros)
    if (!valido) return
    setEnviando(true)
    try {
      const { precisaConfirmarEmail } = await cadastrar(email, senha, nomeLoja)
      if (precisaConfirmarEmail) setAguardandoEmail(true)
      // Com sessão criada, o App troca sozinho para o app logado.
    } catch (err) {
      setErroGeral(err.message || 'Não foi possível criar a conta. Tente novamente.')
      setEnviando(false)
    }
  }

  const classeCampo =
    'mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-ground">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 shadow-sm">
          <img src="/icons/icon-512.png" alt="Crediário Digital" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-display font-semibold text-ink">Crediário Digital</h1>
        <p className="text-sm text-ink-muted mt-1">Crie sua conta — teste grátis por 30 dias</p>
      </div>

      {aguardandoEmail ? (
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
            <Mail size={26} className="text-brand" />
          </div>
          <div>
            <p className="font-display font-semibold text-ink">Confirme seu email</p>
            <p className="text-sm text-ink-muted mt-1">
              Enviamos um email de confirmação para <span className="font-semibold">{email}</span>.
              Clique no link do email para ativar sua conta e entrar.
            </p>
            <p className="text-sm text-ink-muted mt-2">
              Seu teste grátis vai até <span className="font-semibold">{fimTeste}</span>.
            </p>
          </div>
          <button
            onClick={aoIrParaLogin}
            className="text-sm text-primary font-semibold underline"
          >
            Voltar ao login
          </button>
        </div>
      ) : (
        <form onSubmit={criarConta} className="space-y-3">
          {erroGeral && (
            <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl text-center">{erroGeral}</p>
          )}

          <label className="block">
            <span className="text-[11px] font-mono font-medium text-ink-muted uppercase tracking-wide">Nome da loja</span>
            <input
              type="text"
              autoComplete="organization"
              value={nomeLoja}
              onChange={e => setNomeLoja(e.target.value)}
              placeholder="Mercearia do Zé"
              className={classeCampo}
            />
            {erros.nomeLoja && <p className="text-xs text-danger mt-1">{erros.nomeLoja}</p>}
          </label>

          <label className="block">
            <span className="text-[11px] font-mono font-medium text-ink-muted uppercase tracking-wide">Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className={classeCampo}
            />
            {erros.email && <p className="text-xs text-danger mt-1">{erros.email}</p>}
          </label>

          <label className="block">
            <span className="text-[11px] font-mono font-medium text-ink-muted uppercase tracking-wide">Senha</span>
            <div className="relative mt-1.5">
              <input
                type={verSenha ? 'text' : 'password'}
                autoComplete="new-password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="mínimo 6 caracteres"
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
            {erros.senha && <p className="text-xs text-danger mt-1">{erros.senha}</p>}
          </label>

          <label className="block">
            <span className="text-[11px] font-mono font-medium text-ink-muted uppercase tracking-wide">Confirmar senha</span>
            <input
              type={verSenha ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={e => setConfirmarSenha(e.target.value)}
              placeholder="repita a senha"
              className={classeCampo}
            />
            {erros.confirmarSenha && <p className="text-xs text-danger mt-1">{erros.confirmarSenha}</p>}
          </label>

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base active:bg-primary-light transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <UserPlus size={18} />
            {enviando ? 'Criando conta…' : 'Criar conta grátis'}
          </button>

          <p className="text-center text-xs text-ink-muted">
            Teste grátis até {fimTeste} · sem cartão de crédito
          </p>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={aoIrParaLogin}
              className="text-sm text-ink-muted hover:text-primary transition-colors"
            >
              Já tem conta? <span className="font-semibold text-primary">Entrar</span>
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
