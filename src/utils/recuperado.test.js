process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { totalRecebido } from './recuperado.js'

const venda = (parcelas) => ({ parcelas })
const parc = (valor, pago) => ({ valor, pago })

describe('totalRecebido', () => {
  it('vazio: zero', () => {
    expect(totalRecebido([])).toBe(0)
  })

  it('soma só as parcelas pagas, ignora as em aberto', () => {
    const vendas = [
      venda([parc(100, true), parc(50, false)]),
      venda([parc(30, true)]),
    ]
    expect(totalRecebido(vendas)).toBe(130)
  })

  it('tudo em aberto: zero', () => {
    expect(totalRecebido([venda([parc(100, false), parc(200, false)])])).toBe(0)
  })

  it('arredonda para 2 casas (centavos)', () => {
    expect(totalRecebido([venda([parc(10.1, true), parc(20.2, true)])])).toBe(30.3)
  })

  it('tolera venda sem parcelas', () => {
    expect(totalRecebido([{ parcelas: undefined }, venda([parc(40, true)])])).toBe(40)
  })
})
