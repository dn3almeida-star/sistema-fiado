import { Home, Users, PlusCircle, Bell, BarChart2 } from 'lucide-react'

const abas = [
  { id: 'dashboard',  label: 'Início',    Icon: Home       },
  { id: 'clientes',   label: 'Clientes',  Icon: Users      },
  { id: 'nova-venda', label: 'Nova Venda',Icon: PlusCircle },
  { id: 'cobrancas',  label: 'Cobranças', Icon: Bell       },
  { id: 'relatorio',  label: 'Relatório', Icon: BarChart2  },
]

export default function BottomNav({ paginaAtiva, onNavegar }) {
  const paginaNavBar = paginaAtiva === 'perfil' ? 'clientes' : paginaAtiva

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-end">
        {abas.map(({ id, label, Icon }) => {
          const ativo = paginaNavBar === id
          const isCentro = id === 'nova-venda'

          if (isCentro) {
            return (
              <button
                key={id}
                onClick={() => onNavegar(id)}
                className="flex-1 flex flex-col items-center pb-2 pt-1"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 -mt-5 ${
                    ativo ? 'bg-primary-light' : 'bg-primary'
                  }`}
                >
                  <Icon size={23} className="text-white" strokeWidth={2.5} />
                </div>
                <span className={`text-[10px] mt-1 font-semibold ${ativo ? 'text-primary' : 'text-ink-muted'}`}>
                  {label}
                </span>
              </button>
            )
          }

          return (
            <button
              key={id}
              onClick={() => onNavegar(id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[56px] transition-colors ${
                ativo ? 'text-primary' : 'text-ink-muted'
              }`}
            >
              <Icon size={21} strokeWidth={ativo ? 2.5 : 1.8} />
              <span className={`text-[10px] mt-0.5 ${ativo ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
              {ativo && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
