export function formatarMoeda(valor) {
  return (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarData(iso) {
  if (!iso) return '-'
  // Suporta tanto "YYYY-MM-DD" quanto "YYYY-MM-DDThh:mm:ss.sssZ"
  const date = iso.length === 10 ? new Date(iso + 'T00:00:00') : new Date(iso)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('pt-BR')
}

export function formatarDataHora(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function hoje() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function diasAteVencimento(iso) {
  const h = new Date()
  h.setHours(0, 0, 0, 0)
  const vc = new Date(iso + 'T00:00:00')
  return Math.round((vc - h) / 86400000)
}

export function statusParcela(parcela) {
  if (parcela.pago) return { label: 'Pago', cor: 'success', bg: 'bg-green-100', texto: 'text-green-700' }
  const dias = diasAteVencimento(parcela.vencimento)
  if (dias < 0) return { label: `${Math.abs(dias)}d atraso`, cor: 'danger', bg: 'bg-red-100', texto: 'text-red-700' }
  if (dias === 0) return { label: 'Vence hoje', cor: 'danger', bg: 'bg-orange-100', texto: 'text-orange-700' }
  if (dias <= 7) return { label: `${dias}d`, cor: 'warning', bg: 'bg-yellow-100', texto: 'text-yellow-700' }
  return { label: `${dias}d`, cor: 'normal', bg: 'bg-gray-100', texto: 'text-gray-600' }
}

export function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function mascaraTelefone(valor) {
  const d = (valor || '').replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function formatarTelefone(tel) {
  return mascaraTelefone(tel || '')
}
