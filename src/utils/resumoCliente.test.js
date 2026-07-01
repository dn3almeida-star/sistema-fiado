import { describe, it, expect } from 'vitest'
import { resumoCliente } from './resumoCliente.js'

const HOJE = '2026-07-01'

describe('resumoCliente', () => {
  it('cliente sem vendas: quitado, saldo 0', () => {
    const r = resumoCliente([], 'c1', HOJE)
    expect(r).toEqual({ saldo: 0, emAtraso: false, situacao: 'quitado' })
  })

  it('todas as parcelas pagas: quitado', () => {
    const vendas = [{ clienteId: 'c1', parcelas: [
      { valor: 100, vencimento: '2026-06-01', pago: true },
      { valor: 100, vencimento: '2026-08-01', pago: true },
    ] }]
    expect(resumoCliente(vendas, 'c1', HOJE).situacao).toBe('quitado')
    expect(resumoCliente(vendas, 'c1', HOJE).saldo).toBe(0)
  })

  it('parcela futura em aberto: em_dia com saldo somado', () => {
    const vendas = [{ clienteId: 'c1', parcelas: [
      { valor: 150, vencimento: '2026-08-01', pago: false },
      { valor: 50, vencimento: '2026-09-01', pago: false },
    ] }]
    const r = resumoCliente(vendas, 'c1', HOJE)
    expect(r.saldo).toBe(200)
    expect(r.emAtraso).toBe(false)
    expect(r.situacao).toBe('em_dia')
  })

  it('parcela vencida em aberto: atraso', () => {
    const vendas = [{ clienteId: 'c1', parcelas: [
      { valor: 80, vencimento: '2026-06-15', pago: false },
      { valor: 80, vencimento: '2026-08-15', pago: false },
    ] }]
    const r = resumoCliente(vendas, 'c1', HOJE)
    expect(r.emAtraso).toBe(true)
    expect(r.situacao).toBe('atraso')
    expect(r.saldo).toBe(160)
  })

  it('vence hoje conta como em_dia, nao atraso', () => {
    const vendas = [{ clienteId: 'c1', parcelas: [
      { valor: 100, vencimento: HOJE, pago: false },
    ] }]
    expect(resumoCliente(vendas, 'c1', HOJE).situacao).toBe('em_dia')
  })

  it('ignora vendas de outros clientes', () => {
    const vendas = [
      { clienteId: 'c1', parcelas: [{ valor: 100, vencimento: '2026-06-01', pago: false }] },
      { clienteId: 'c2', parcelas: [{ valor: 999, vencimento: '2026-06-01', pago: false }] },
    ]
    expect(resumoCliente(vendas, 'c1', HOJE).saldo).toBe(100)
  })
})
