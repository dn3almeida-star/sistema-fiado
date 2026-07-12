import { ArrowLeft, Users, Zap, DollarSign, Clock, Gift, BarChart3 } from 'lucide-react'
import CardResumo from '../components/CardResumo.jsx'
import { useMetricas } from '../hooks/useMetricas.js'

// Painel do funil (gtm §9) — só o fundador vê. Números vêm da RPC agregada.
export default function Metricas({ navegar }) {
  const { metricas, carregando, erro } = useMetricas()

  return (
    <div className="min-h-screen pb-6">
      <div className="bg-primary text-white px-4 pt-4 pb-6">
        <button onClick={() => navegar('dashboard')} className="flex items-center gap-2 text-white/70 mb-3 min-h-touch hover:text-white transition-colors">
          <ArrowLeft size={20} /> <span className="text-sm font-medium">Início</span>
        </button>
        <h1 className="text-xl font-display font-semibold">Métricas do funil</h1>
        <p className="text-white/70 text-sm mt-1">Só você vê isso.</p>
      </div>

      <div className="p-4 space-y-4">
        {carregando ? (
          <p className="text-sm text-ink-muted text-center py-10">Carregando…</p>
        ) : erro || !metricas ? (
          <p className="text-sm text-danger bg-danger/10 px-3 py-2 rounded-xl">
            Não foi possível carregar as métricas.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <CardResumo titulo="Cadastros" valor={metricas.cadastros} sub="lojistas no total" icone={Users} cor="primary" />
              <CardResumo titulo="Ativação" valor={`${metricas.taxaAtivacao}%`} sub={`${metricas.ativados} enviaram 1ª cobrança`} icone={Zap} cor={metricas.taxaAtivacao >= 40 ? 'success' : 'warning'} />
              <CardResumo titulo="Pagantes" valor={metricas.pagantes} sub={`${metricas.taxaPagantes}% dos cadastros`} icone={DollarSign} cor="success" />
              <CardResumo titulo="Em teste" valor={metricas.emTeste} sub="ainda no período grátis" icone={Clock} cor="primary" />
              <div className="col-span-2">
                <CardResumo titulo="Indicações" valor={metricas.indicacoes} sub={`${metricas.indicacoesConvertidas} viraram pagantes`} icone={Gift} cor="primary" />
              </div>
            </div>

            {metricas.taxaAtivacao < 40 && metricas.cadastros > 0 && (
              <div className="bg-warning/10 border border-warning/20 rounded-2xl p-3 flex items-start gap-2">
                <BarChart3 size={18} className="text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-ink">
                  Ativação abaixo de 40%: o gargalo é o <strong>produto/onboarding</strong>,
                  não o marketing. Conserte a 1ª experiência antes de escalar anúncio.
                </p>
              </div>
            )}

            <p className="text-xs text-ink-muted leading-relaxed">
              Inclui as 2 contas semente (você e seu pai). Os comentários “FIADO”
              das redes você conta na própria plataforma — não dá pra medir aqui.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
