// Resumo dos cobráveis do dia para o lembrete diário. Funções puras (recebem
// a data), sem I/O e sem APIs do Deno — testáveis com Vitest, importáveis pela
// Edge Function. Espelha a regra de atraso do app (não paga, vencimento <= hoje).

export interface ParcelaLembrete {
  vencimento: string // 'YYYY-MM-DD'
  valor: number
  pago: boolean
}
export interface VendaLembrete {
  clienteId: string
  parcelas: ParcelaLembrete[]
}
export interface ClienteLembrete {
  id: string
  nome: string
  telefone?: string
}
export interface Urgente {
  nome: string
  valor: number
  diasAtraso: number
}
export interface Resumo {
  vazio: boolean
  atrasadas: number
  vencendoHoje: number
  totalCobrar: number
  topUrgentes: Urgente[]
}

export function resumoDia(
  vendas: VendaLembrete[],
  clientes: ClienteLembrete[],
  hojeISO: string,
): Resumo {
  const itens: Urgente[] = []
  for (const venda of vendas) {
    const cliente = clientes.find((c) => c.id === venda.clienteId)
    if (!cliente) continue
    for (const parcela of venda.parcelas) {
      if (parcela.pago) continue
      if (parcela.vencimento > hojeISO) continue
      itens.push({
        nome: cliente.nome,
        valor: parcela.valor,
        diasAtraso: diasEntre(parcela.vencimento, hojeISO),
      })
    }
  }

  const atrasadas = itens.filter((i) => i.diasAtraso > 0).length
  const vencendoHoje = itens.filter((i) => i.diasAtraso === 0).length
  const totalCobrar = arredondar2(itens.reduce((s, i) => s + i.valor, 0))
  const topUrgentes = [...itens]
    .sort((a, b) =>
      b.diasAtraso - a.diasAtraso ||
      b.valor - a.valor ||
      a.nome.localeCompare(b.nome),
    )
    .slice(0, 3)

  return { vazio: itens.length === 0, atrasadas, vencendoHoje, totalCobrar, topUrgentes }
}

export function montarMensagem(r: Resumo): string {
  const total = 'R$ ' + r.totalCobrar.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const lista = r.topUrgentes
    .map((u) => `${u.nome} R$${Math.round(u.valor).toLocaleString('pt-BR')} (${u.diasAtraso}d)`)
    .join(', ')
  return `☀️ Bom dia! Hoje: ${r.atrasadas} atrasadas + ${r.vencendoHoje} vencendo. ` +
    `A cobrar: ${total}. Mais urgentes: ${lista}. Abra o app pra cobrar.`
}

export function dataSaoPaulo(date: Date): string {
  // 'en-CA' formata como 'YYYY-MM-DD'; timeZone garante o dia correto em SP.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date)
}

function diasEntre(vencimentoISO: string, hojeISO: string): number {
  const v = new Date(vencimentoISO + 'T00:00:00')
  const h = new Date(hojeISO + 'T00:00:00')
  return Math.round((h.getTime() - v.getTime()) / 86400000)
}

function arredondar2(n: number): number {
  return Math.round(n * 100) / 100
}
