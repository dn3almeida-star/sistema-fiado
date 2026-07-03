import { ehVendaAvista } from './vendaAvista.js'

export function statusVenda(venda) {
  if (ehVendaAvista(venda)) {
    return { label: 'À Vista', classe: 'bg-blue-500/10 text-blue-500' }
  }
  const parcelas = Array.isArray(venda?.parcelas) ? venda.parcelas : []
  const temAberta = parcelas.some(p => !p?.pago)
  if (parcelas.length > 0 && !temAberta) {
    return { label: 'Quitada', classe: 'bg-brand/10 text-brand' }
  }
  return { label: 'Em aberto', classe: 'bg-red-500/10 text-red-500' }
}
