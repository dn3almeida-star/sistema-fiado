const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function diasDoMes(ano, mes) {
  const primeiroDia = new Date(ano, mes - 1, 1)
  const diaSemanaInicio = primeiroDia.getDay()
  const ultimoDia = new Date(ano, mes, 0).getDate()
  const slots = []
  for (let i = 0; i < diaSemanaInicio; i++) slots.push(null)
  for (let d = 1; d <= ultimoDia; d++) slots.push(d)
  return slots
}

export function nomeDoMes(mes) {
  return NOMES_MESES[mes - 1]
}

export function rotuloPeriodo(granularidade, valor) {
  if (!valor) return ''
  if (granularidade === 'dia') {
    const [ano, mes, dia] = valor.split('-')
    return `${dia}/${mes}/${ano}`
  }
  if (granularidade === 'mes') {
    const [ano, mes] = valor.split('-')
    return `${nomeDoMes(Number(mes))} de ${ano}`
  }
  if (granularidade === 'ano') return valor
  return ''
}
