import { dataLocal } from './vendaAvista.js'

export function vendaNoPeriodo(venda, granularidade, valor) {
  if (!valor) return true
  if (!venda?.criadaEm) return false
  const dataVenda = dataLocal(venda.criadaEm)
  if (granularidade === 'dia') return dataVenda === valor
  if (granularidade === 'mes') return dataVenda.slice(0, 7) === valor
  if (granularidade === 'ano') return dataVenda.slice(0, 4) === valor
  return true
}
