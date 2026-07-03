import { motion } from 'framer-motion'

const OPCOES = [
  { id: 'todos',   label: 'Todos'     },
  { id: 'atraso',  label: 'Em atraso' },
  { id: 'em_dia',  label: 'Em dia'    },
  { id: 'quitado', label: 'Quitados'  },
]

export default function FiltroSituacao({ filtro, onSelect, contagens }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {OPCOES.map(o => {
        const ativo = filtro === o.id
        return (
          <motion.button
            key={o.id}
            onClick={() => onSelect(o.id)}
            whileTap={{ scale: 0.96 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              ativo
                ? 'bg-primary text-white'
                : 'bg-surface border border-border text-ink-muted active:bg-surface-2'
            }`}
          >
            {o.label}
            <span className={`text-xs font-mono tabular-nums ${ativo ? 'text-white/80' : 'text-ink-muted'}`}>
              {contagens[o.id] ?? 0}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
