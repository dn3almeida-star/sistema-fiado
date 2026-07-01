import { describe, it, expect } from 'vitest'
import { metricasRelatorio, deslocarMes, labelMes } from './metricasRelatorio.js'

const HOJE = '2026-07-01' // mês atual: 2026-07

describe('deslocarMes', () => {
  it('desloca para frente e para trás', () => {
    expect(deslocarMes('2026-07', 0)).toBe('2026-07')
    expect(deslocarMes('2026-07', -5)).toBe('2026-02')
    expect(deslocarMes('2026-07', 2)).toBe('2026-09')
  })
  it('atravessa a virada de ano', () => {
    expect(deslocarMes('2026-01', -1)).toBe('2025-12')
    expect(deslocarMes('2026-11', 3)).toBe('2027-02')
  })
})

describe('labelMes', () => {
  it('retorna o mês abreviado pt-BR', () => {
    expect(labelMes('2026-07')).toBe('jul')
    expect(labelMes('2026-01')).toBe('jan')
    expect(labelMes('2026-12')).toBe('dez')
  })
})

describe('metricasRelatorio', () => {
  const clientes = [{ id: 'c1', nome: 'Ana' }, { id: 'c2', nome: 'Bruno' }]
  const vendas = [
    { clienteId: 'c1', parcelas: [
      { valor: 100, vencimento: '2026-05-10', pago: true,  pagoEm: '2026-05-12' }, // recebido em mai
      { valor: 200, vencimento: '2026-06-10', pago: false }, // vencida (a receber -> mês atual jul)
      { valor: 150, vencimento: '2026-08-10', pago: false }, // a receber em ago
    ] },
    { clienteId: 'c2', parcelas: [
      { valor: 300, vencimento: '2026-07-20', pago: false }, // a receber em jul
      { valor: 50,  vencimento: '2026-04-01', pago: true, pagoEm: '2026-07-02' }, // recebido em jul
    ] },
  ]

  it('recebido por mês: 6 meses crescentes, soma por pagoEm', () => {
    const { recebidoPorMes } = metricasRelatorio(vendas, clientes, HOJE)
    expect(recebidoPorMes.map(x => x.mes)).toEqual(['2026-02','2026-03','2026-04','2026-05','2026-06','2026-07'])
    const mai = recebidoPorMes.find(x => x.mes === '2026-05')
    const jul = recebidoPorMes.find(x => x.mes === '2026-07')
    expect(mai.valor).toBe(100)
    expect(jul.valor).toBe(50)
    expect(recebidoPorMes.find(x => x.mes === '2026-03').valor).toBe(0)
  })

  it('a receber por mês: vencidas somam no mês atual', () => {
    const { aReceberPorMes } = metricasRelatorio(vendas, clientes, HOJE)
    expect(aReceberPorMes.map(x => x.mes)).toEqual(['2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'])
    // jul = 200 (vencida jun) + 300 (jul) = 500
    expect(aReceberPorMes.find(x => x.mes === '2026-07').valor).toBe(500)
    expect(aReceberPorMes.find(x => x.mes === '2026-08').valor).toBe(150)
  })

  it('top devedores: saldo desc, só saldo > 0', () => {
    const { topDevedores } = metricasRelatorio(vendas, clientes, HOJE)
    // c1 aberto = 200 + 150 = 350; c2 aberto = 300
    expect(topDevedores.map(x => x.cliente.id)).toEqual(['c1', 'c2'])
    expect(topDevedores[0].saldo).toBe(350)
  })

  it('pago vs aberto: totais de todas as parcelas', () => {
    const { pagoVsAberto } = metricasRelatorio(vendas, clientes, HOJE)
    expect(pagoVsAberto.pago).toBe(150)   // 100 + 50
    expect(pagoVsAberto.aberto).toBe(650) // 200 + 150 + 300
  })
})
