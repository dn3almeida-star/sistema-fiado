import { ehVendaAvista } from './vendaAvista.js'

export function statusVenda(venda) {
  if (ehVendaAvista(venda)) {
    return { label: 'À Vista', classe: 'bg-blue-50 text-blue-700' }
  }
  const parcelas = Array.isArray(venda?.parcelas) ? venda.parcelas : []
  const temAberta = parcelas.some(p => !p?.pago)
  if (parcelas.length > 0 && !temAberta) {
    return { label: 'Quitada', classe: 'bg-green-50 text-green-700' }
  }
  return { label: 'Em aberto', classe: 'bg-red-50 text-red-600' }
}
