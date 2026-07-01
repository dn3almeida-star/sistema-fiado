import { useState } from 'react'
import { ArrowLeft, Store, Upload } from 'lucide-react'
import { mascaraTelefone } from '../utils/formatadores.js'

export default function PerfilLoja({ profile, salvarProfile, enviarLogo, mostrarToast, modoInicial = false, onConcluir, navegar }) {
  const [nomeLoja, setNomeLoja] = useState(profile?.nome_loja ?? '')
  const [telefone, setTelefone] = useState(profile?.telefone ?? '')
  const [logoUrl, setLogoUrl] = useState(profile?.logo_url ?? '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviandoLogo, setEnviandoLogo] = useState(false)

  async function trocarLogo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      mostrarToast('Selecione um arquivo de imagem.', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      mostrarToast('Imagem muito grande (máx. 2 MB).', 'error')
      return
    }
    setEnviandoLogo(true)
    try {
      const url = await enviarLogo(file)
      setLogoUrl(url)
      mostrarToast('✓ Logo atualizada')
    } catch {
      mostrarToast('Erro ao enviar a logo.', 'error')
    } finally {
      setEnviandoLogo(false)
    }
  }

  async function salvar() {
    if (!nomeLoja.trim()) {
      setErro('Informe o nome da loja')
      return
    }
    setSalvando(true)
    try {
      await salvarProfile({ nome_loja: nomeLoja.trim(), telefone })
      mostrarToast('✓ Perfil salvo')
      if (modoInicial && onConcluir) onConcluir()
    } catch {
      setErro('Erro ao salvar. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen pb-6">
      <div className="bg-primary text-white px-4 pt-4 pb-6">
        {!modoInicial && (
          <button
            onClick={() => navegar('dashboard')}
            className="flex items-center gap-2 text-white/70 mb-3 min-h-touch hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Início</span>
          </button>
        )}
        <h1 className="text-xl font-bold">{modoInicial ? 'Bem-vindo!' : 'Perfil da Loja'}</h1>
        {modoInicial && (
          <p className="text-white/70 text-sm mt-1">Antes de começar, conte sobre a sua loja.</p>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Logo */}
        <div className="bg-surface rounded-2xl shadow-sm p-4 flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Store size={28} className="text-primary" />
            )}
          </div>
          <label className="flex-1">
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Logo da loja</span>
            <div className="mt-1.5 flex items-center gap-2 bg-primary-50 text-primary px-4 py-2.5 rounded-xl font-semibold text-sm cursor-pointer active:bg-primary/10 transition-colors w-fit">
              <Upload size={16} />
              {enviandoLogo ? 'Enviando…' : 'Escolher imagem'}
            </div>
            <input type="file" accept="image/*" onChange={trocarLogo} className="hidden" disabled={enviandoLogo} />
          </label>
        </div>

        {erro && <p className="text-sm text-danger bg-red-50 px-3 py-2 rounded-xl">{erro}</p>}

        <label className="block">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Nome da loja *</span>
          <input
            type="text"
            value={nomeLoja}
            onChange={e => setNomeLoja(e.target.value)}
            placeholder="Ex: Iran Utilidades"
            className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Telefone / WhatsApp</span>
          <input
            type="tel"
            inputMode="numeric"
            value={telefone}
            onChange={e => setTelefone(mascaraTelefone(e.target.value))}
            placeholder="(00) 00000-0000"
            className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </label>

        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base active:bg-primary-light transition-colors shadow-sm disabled:opacity-60"
        >
          {salvando ? 'Salvando…' : modoInicial ? 'Começar a usar' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
