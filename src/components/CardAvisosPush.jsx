import { Bell, BellRing } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { usePush } from '../hooks/usePush.js'

// Cartão de opt-in das notificações push (no Perfil da Loja). Aviso diário de
// cobranças no celular — a versão que escala do lembrete.
export default function CardAvisosPush() {
  const { usuario } = useAuth()
  const { suportado, permissao, inscrito, ocupado, ativar, desativar } = usePush(usuario)

  if (!suportado) {
    return (
      <div className="bg-surface rounded-2xl shadow-sm p-4">
        <p className="text-sm font-semibold text-ink">Avisos no celular</p>
        <p className="text-xs text-ink-muted mt-1">
          Seu navegador não suporta avisos. No iPhone, adicione o app à tela de
          início primeiro.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-2xl shadow-sm p-4 flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
        {inscrito ? <BellRing size={20} className="text-primary" /> : <Bell size={20} className="text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">Avisos no celular</p>
        <p className="text-xs text-ink-muted mt-0.5">
          {permissao === 'denied'
            ? 'Bloqueado. Libere as notificações nas configurações do navegador.'
            : inscrito
              ? 'Ativado — você recebe o resumo de cobranças todo dia.'
              : 'Receba todo dia quantas cobranças você tem pra fazer.'}
        </p>
      </div>
      {permissao !== 'denied' && (
        <button
          onClick={inscrito ? desativar : ativar}
          disabled={ocupado}
          className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold min-h-touch transition-colors disabled:opacity-60 ${
            inscrito
              ? 'border border-border text-ink-muted active:bg-surface-2'
              : 'bg-primary text-white active:bg-primary-light'
          }`}
        >
          {ocupado ? '…' : inscrito ? 'Desativar' : 'Ativar'}
        </button>
      )}
    </div>
  )
}
