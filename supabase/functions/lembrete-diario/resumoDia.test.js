process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { resumoDia, montarMensagem, dataSaoPaulo } from './resumoDia.ts'

const HOJE = '2026-07-10'

const clientes = [
  { id: 'c1', nome: 'Carlos', telefone: '11999999999' },
  { id: 'c2', nome: 'Maria', telefone: '11888888888' },
  { id: 'c3', nome: 'Ana', telefone: '' }, // sem telefone
]

function parcela(vencimento, valor, extra = {}) {
  return { vencimento, valor, pago: false, ...extra }
}

describe('resumoDia', () => {
  it('conta atrasadas e vencendo hoje, soma o total e lista os mais urgentes', () => {
    const vendas = [
      { clienteId: 'c1', parcelas: [parcela('2026-07-01', 200)] }, // 9d
      { clienteId: 'c2', parcelas: [parcela('2026-07-05', 120)] }, // 5d
      { clienteId: 'c3', parcelas: [parcela('2026-07-10', 145)] }, // hoje
    ]
    const r = resumoDia(vendas, clientes, HOJE)
    expect(r.vazio).toBe(false)
    expect(r.atrasadas).toBe(2)
    expect(r.vencendoHoje).toBe(1)
    expect(r.totalCobrar).toBe(465)
    expect(r.topUrgentes).toEqual([
      { nome: 'Carlos', valor: 200, diasAtraso: 9 },
      { nome: 'Maria', valor: 120, diasAtraso: 5 },
      { nome: 'Ana', valor: 145, diasAtraso: 0 },
    ])
  })

  it('limita topUrgentes a 3, ordenando por atraso desc e valor desc no empate', () => {
    const cs = [
      { id: 'a', nome: 'A' }, { id: 'b', nome: 'B' },
      { id: 'c', nome: 'C' }, { id: 'd', nome: 'D' },
    ]
    const vendas = [
      { clienteId: 'a', parcelas: [parcela('2026-07-08', 50)] },  // 2d
      { clienteId: 'b', parcelas: [parcela('2026-07-01', 10)] },  // 9d
      { clienteId: 'c', parcelas: [parcela('2026-07-01', 90)] },  // 9d, valor maior
      { clienteId: 'd', parcelas: [parcela('2026-07-09', 30)] },  // 1d
    ]
    const r = resumoDia(vendas, cs, HOJE)
    expect(r.topUrgentes.map(u => u.nome)).toEqual(['C', 'B', 'A'])
  })

  it('ignora parcelas pagas e futuras', () => {
    const vendas = [
      { clienteId: 'c1', parcelas: [
        parcela('2026-07-01', 100, { pago: true }),
        parcela('2026-08-01', 100),
      ] },
    ]
    expect(resumoDia(vendas, clientes, HOJE).vazio).toBe(true)
  })

  it('inclui cliente sem telefone (o lembrete é para o lojista, não para o cliente)', () => {
    const vendas = [{ clienteId: 'c3', parcelas: [parcela('2026-07-02', 80)] }]
    const r = resumoDia(vendas, clientes, HOJE)
    expect(r.atrasadas).toBe(1)
    expect(r.topUrgentes[0].nome).toBe('Ana')
  })

  it('ignora venda de cliente inexistente', () => {
    const vendas = [{ clienteId: 'zzz', parcelas: [parcela('2026-07-01', 100)] }]
    expect(resumoDia(vendas, clientes, HOJE).vazio).toBe(true)
  })

  it('fila vazia retorna resumo zerado', () => {
    const r = resumoDia([], clientes, HOJE)
    expect(r).toEqual({ vazio: true, atrasadas: 0, vencendoHoje: 0, totalCobrar: 0, topUrgentes: [] })
  })
})

describe('montarMensagem', () => {
  it('formata exatamente o resumo do dia', () => {
    const r = {
      vazio: false, atrasadas: 3, vencendoHoje: 2, totalCobrar: 465,
      topUrgentes: [
        { nome: 'Carlos', valor: 200, diasAtraso: 9 },
        { nome: 'Maria', valor: 120, diasAtraso: 5 },
      ],
    }
    expect(montarMensagem(r)).toBe(
      '☀️ Bom dia! Hoje: 3 atrasadas + 2 vencendo. A cobrar: R$ 465,00. ' +
      'Mais urgentes: Carlos R$200 (9d), Maria R$120 (5d). Abra o app pra cobrar.'
    )
  })
})

describe('dataSaoPaulo', () => {
  it('11:00 UTC cai no mesmo dia em São Paulo (08:00)', () => {
    expect(dataSaoPaulo(new Date('2026-07-04T11:00:00Z'))).toBe('2026-07-04')
  })
  it('madrugada UTC cai no dia anterior em São Paulo', () => {
    expect(dataSaoPaulo(new Date('2026-07-04T02:30:00Z'))).toBe('2026-07-03')
  })
})
