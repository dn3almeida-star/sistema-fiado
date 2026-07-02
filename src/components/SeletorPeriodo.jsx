import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { diasDoMes, nomeDoMes, decadaDoAno } from '../utils/calendario.js'

const ABAS = [
  { id: 'dia', label: 'Dia' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
]

function pad2(n) {
  return String(n).padStart(2, '0')
}

const CELULA_BASE = 'rounded-lg text-sm font-medium transition-colors'
const CELULA_SELECIONADA = 'bg-primary text-white'
const CELULA_NORMAL = 'text-ink active:bg-surface-2'

export default function SeletorPeriodo({ valor, onSelecionar }) {
  const hoje = new Date()
  const [aba, setAba] = useState('dia')
  const [anoVistaDia, setAnoVistaDia] = useState(hoje.getFullYear())
  const [mesVistaDia, setMesVistaDia] = useState(hoje.getMonth() + 1)
  const [anoVistaMes, setAnoVistaMes] = useState(hoje.getFullYear())
  const [decadaVistaAno, setDecadaVistaAno] = useState(decadaDoAno(hoje.getFullYear()))

  function mesAnterior() {
    if (mesVistaDia === 1) { setMesVistaDia(12); setAnoVistaDia(a => a - 1) }
    else setMesVistaDia(m => m - 1)
  }

  function mesProximo() {
    if (mesVistaDia === 12) { setMesVistaDia(1); setAnoVistaDia(a => a + 1) }
    else setMesVistaDia(m => m + 1)
  }

  function selecionarDia(dia) {
    const valorDia = `${anoVistaDia}-${pad2(mesVistaDia)}-${pad2(dia)}`
    onSelecionar('dia', valor === valorDia ? '' : valorDia)
  }

  function selecionarMes(mes) {
    const valorMes = `${anoVistaMes}-${pad2(mes)}`
    onSelecionar('mes', valor === valorMes ? '' : valorMes)
  }

  function selecionarAno(ano) {
    const valorAno = String(ano)
    onSelecionar('ano', valor === valorAno ? '' : valorAno)
  }

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-sm p-3">
      <div className="flex gap-2 bg-surface-2 p-1 rounded-xl mb-3">
        {ABAS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
              aba === id ? 'bg-primary text-white shadow-sm' : 'text-ink-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aba === 'dia' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={mesAnterior} className="p-2 text-ink-muted">
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-ink text-sm">{nomeDoMes(mesVistaDia)} {anoVistaDia}</span>
            <button type="button" onClick={mesProximo} className="p-2 text-ink-muted">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-muted mb-1">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {diasDoMes(anoVistaDia, mesVistaDia).map((dia, i) => {
              if (dia === null) return <span key={i} />
              const valorDia = `${anoVistaDia}-${pad2(mesVistaDia)}-${pad2(dia)}`
              const selecionado = valor === valorDia
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selecionarDia(dia)}
                  className={`aspect-square ${CELULA_BASE} ${selecionado ? CELULA_SELECIONADA : CELULA_NORMAL}`}
                >
                  {dia}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {aba === 'mes' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setAnoVistaMes(a => a - 1)} className="p-2 text-ink-muted">
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-ink text-sm">{anoVistaMes}</span>
            <button type="button" onClick={() => setAnoVistaMes(a => a + 1)} className="p-2 text-ink-muted">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
              const valorMes = `${anoVistaMes}-${pad2(mes)}`
              const selecionado = valor === valorMes
              return (
                <button
                  key={mes}
                  type="button"
                  onClick={() => selecionarMes(mes)}
                  className={`py-2.5 ${CELULA_BASE} ${selecionado ? CELULA_SELECIONADA : CELULA_NORMAL}`}
                >
                  {nomeDoMes(mes).slice(0, 3)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {aba === 'ano' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setDecadaVistaAno(d => d - 10)} className="p-2 text-ink-muted">
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-ink text-sm">{decadaVistaAno}–{decadaVistaAno + 9}</span>
            <button type="button" onClick={() => setDecadaVistaAno(d => d + 10)} className="p-2 text-ink-muted">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Array.from({ length: 10 }, (_, i) => decadaVistaAno + i).map(ano => {
              const valorAno = String(ano)
              const selecionado = valor === valorAno
              return (
                <button
                  key={ano}
                  type="button"
                  onClick={() => selecionarAno(ano)}
                  className={`py-2.5 ${CELULA_BASE} ${selecionado ? CELULA_SELECIONADA : CELULA_NORMAL}`}
                >
                  {ano}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
