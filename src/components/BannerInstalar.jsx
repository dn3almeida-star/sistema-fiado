import { Download, Share, X, Smartphone } from 'lucide-react'

// Convite pra instalar o PWA na tela inicial ("instala em 2 min, sem loja de
// app" do funil). No Android usa o prompt nativo; no iPhone mostra o passo a
// passo (Safari não tem instalação programática).
export default function BannerInstalar({ modo, onInstalar, onDispensar }) {
  if (!modo) return null

  return (
    <div className="bg-surface rounded-2xl shadow-sm p-4 flex items-start gap-3">
      <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
        <Smartphone size={20} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">Instale o app no celular</p>
        {modo === 'android' ? (
          <>
            <p className="text-xs text-ink-muted mt-0.5">
              Fica na tela inicial, abre num toque e você recebe os avisos.
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <button
                onClick={onInstalar}
                className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold active:bg-primary-light min-h-touch"
              >
                <Download size={16} /> Instalar
              </button>
              <button onClick={onDispensar} className="px-3 py-2 text-sm font-semibold text-ink-muted hover:text-ink min-h-touch">
                Agora não
              </button>
            </div>
          </>
        ) : (
          <p className="text-xs text-ink-muted mt-1 leading-relaxed">
            No iPhone: toque em <Share size={13} className="inline align-text-bottom text-primary" />{' '}
            <strong className="text-ink">Compartilhar</strong> e depois em{' '}
            <strong className="text-ink">“Adicionar à Tela de Início”</strong>.
          </p>
        )}
      </div>
      <button onClick={onDispensar} className="text-ink-muted hover:text-ink p-0.5 -mt-0.5 shrink-0" aria-label="Dispensar">
        <X size={16} />
      </button>
    </div>
  )
}
