import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { diasDoMes, nomeDoMes } from '../utils/calendario.js'

const ABAS = [
  { id: 'dia', label: 'Dia' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
]

const CINCO_MINUTOS_MS = 5 * 60 * 1000

function pad2(n) {
  return String(n).padStart(2, '0')
}

export default function SeletorPeriodo({ aberto, onFechar, valor, onSelecionar }) {
  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth() + 1
  const diaAtual = hoje.getDate()

  const [aba, setAba] = useState('dia')
  const [anoVistaDia, setAnoVistaDia] = useState(anoAtual)
  const [mesVistaDia, setMesVistaDia] = useState(mesAtual)
  const [anoVistaMes, setAnoVistaMes] = useState(anoAtual)
  const [paginaAnoInicio, setPaginaAnoInicio] = useState(anoAtual)

  const ultimoFechamentoRef = useRef(null)
  const abertoAnteriorRef = useRef(aberto)

  useEffect(() => {
    const estavaAberto = abertoAnteriorRef.current
    if (estavaAberto && !aberto) {
      ultimoFechamentoRef.current = Date.now()
    }
    if (!estavaAberto && aberto) {
      const ultimo = ultimoFechamentoRef.current
      if (ultimo === null || Date.now() - ultimo >= CINCO_MINUTOS_MS) {
        setAba('dia')
        setAnoVistaDia(anoAtual)
        setMesVistaDia(mesAtual)
        setAnoVistaMes(anoAtual)
        setPaginaAnoInicio(anoAtual)
      }
    }
    abertoAnteriorRef.current = aberto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

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
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-surface rounded-2xl shadow-sm p-4 max-w-md w-full space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink">Escolher período</h3>
              <button onClick={onFechar} className="text-ink-muted hover:text-ink p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex gap-2 bg-surface-2 p-1 rounded-xl">
              {ABAS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAba(id)}
                  className={`relative flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
                    aba === id ? 'text-white' : 'text-ink-muted'
                  }`}
                >
                  {aba === id && (
                    <motion.div
                      layoutId="pilula-aba-periodo"
                      className="absolute inset-0 bg-primary rounded-lg shadow-sm"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                  <span className="relative">{label}</span>
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
                <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-ink-muted mb-1.5">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
                </div>
                <motion.div
                  key={`${anoVistaDia}-${mesVistaDia}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-7 gap-1.5"
                >
                  {diasDoMes(anoVistaDia, mesVistaDia).map((dia, i) => {
                    if (dia === null) return <span key={`vazio-${i}`} />
                    const valorDia = `${anoVistaDia}-${pad2(mesVistaDia)}-${pad2(dia)}`
                    const selecionado = valor === valorDia
                    const ehHoje = anoVistaDia === anoAtual && mesVistaDia === mesAtual && dia === diaAtual
                    return (
                      <button
                        key={valorDia}
                        type="button"
                        onClick={() => selecionarDia(dia)}
                        className={`aspect-square rounded-full text-sm font-medium transition-colors ${
                          selecionado
                            ? 'bg-primary text-white'
                            : ehHoje
                            ? 'ring-2 ring-primary text-primary font-semibold'
                            : 'text-ink active:bg-surface-2'
                        }`}
                      >
                        {dia}
                      </button>
                    )
                  })}
                </motion.div>
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
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
                    const valorMes = `${anoVistaMes}-${pad2(mes)}`
                    const selecionado = valor === valorMes
                    return (
                      <button
                        key={valorMes}
                        type="button"
                        onClick={() => selecionarMes(mes)}
                        className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          selecionado ? 'bg-primary text-white' : 'text-ink active:bg-surface-2'
                        }`}
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
                  <button
                    type="button"
                    onClick={() => setPaginaAnoInicio(p => Math.max(anoAtual, p - 10))}
                    disabled={paginaAnoInicio <= anoAtual}
                    className="p-2 text-ink-muted disabled:opacity-30"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="font-semibold text-ink text-sm">{paginaAnoInicio}–{paginaAnoInicio + 9}</span>
                  <button type="button" onClick={() => setPaginaAnoInicio(p => p + 10)} className="p-2 text-ink-muted">
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 10 }, (_, i) => paginaAnoInicio + i).map(ano => {
                    const valorAno = String(ano)
                    const selecionado = valor === valorAno
                    return (
                      <button
                        key={ano}
                        type="button"
                        onClick={() => selecionarAno(ano)}
                        className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          selecionado ? 'bg-primary text-white' : 'text-ink active:bg-surface-2'
                        }`}
                      >
                        {ano}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
