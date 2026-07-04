process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { construirFilaCobranca } from './filaCobranca.js'

const HOJE = '2026-07-10'
const AGORA = '2026-07-10T15:00:00.000Z' // 12:00 em America/Sao_Paulo

const clientes = [
  { id: 'c1', nome: 'Carlos', telefone: '11999999999' },
  { id: 'c2', nome: 'Maria', telefone: '11888888888' },
  { id: 'c3', nome: 'Ana', telefone: '11777777777' },
  { id: 'c4', nome: 'SemFone', telefone: '' },
]

function parcela(numero, vencimento, extra = {}) {
  return { numero, vencimento, valor: 100, pago: false, pagoEm: null, ultimaCobrancaEm: null, ...extra }
}

describe('construirFilaCobranca', () => {
  it('inclui atrasadas + vencendo hoje; exclui pagas, futuras e sem telefone', () => {
    const vendas = [
      { id: 'v1', clienteId: 'c1', parcelas: [
        parcela(1, '2026-07-01'),                 // 9d atraso — entra
        parcela(2, '2026-08-01'),                 // futura — fora
        parcela(3, '2026-06-20', { pago: true, pagoEm: '2026-06-20' }), // paga — fora
      ] },
      { id: 'v2', clienteId: 'c2', parcelas: [ parcela(1, '2026-07-05') ] }, // 5d — entra
      { id: 'v3', clienteId: 'c3', parcelas: [ parcela(1, '2026-07-10') ] }, // hoje — entra
      { id: 'v4', clienteId: 'c4', parcelas: [ parcela(1, '2026-07-02') ] }, // sem telefone — fora
    ]
    const fila = construirFilaCobranca(vendas, clientes, HOJE, AGORA)
    expect(fila.map(i => i.cliente.nome)).toEqual(['Carlos', 'Maria', 'Ana'])
    expect(fila.map(i => i.diasAtraso)).toEqual([9, 5, 0])
    expect(fila.every(i => i.jaCobradoHoje === false)).toBe(true)
  })

  it('quem já foi cobrado hoje vai para o fim, mesmo mais atrasado', () => {
    const vendas = [
      { id: 'v1', clienteId: 'c1', parcelas: [ parcela(1, '2026-06-30', { ultimaCobrancaEm: '2026-07-10T14:00:00.000Z' }) ] }, // 10d, cobrado hoje
      { id: 'v2', clienteId: 'c2', parcelas: [ parcela(1, '2026-07-07') ] }, // 3d, nunca
    ]
    const fila = construirFilaCobranca(vendas, clientes, HOJE, AGORA)
    expect(fila.map(i => i.cliente.nome)).toEqual(['Maria', 'Carlos'])
    expect(fila.map(i => i.jaCobradoHoje)).toEqual([false, true])
  })

  it('desempate: nunca cobrado vem antes de quem já foi cobrado antes (mais antigo primeiro)', () => {
    const vendas = [
      { id: 'v1', clienteId: 'c1', parcelas: [ parcela(1, '2026-07-05', { ultimaCobrancaEm: '2026-07-08T14:00:00.000Z' }) ] }, // 5d, cobrado há 2 dias
      { id: 'v2', clienteId: 'c2', parcelas: [ parcela(1, '2026-07-05') ] }, // 5d, nunca
    ]
    const fila = construirFilaCobranca(vendas, clientes, HOJE, AGORA)
    expect(fila.map(i => i.cliente.nome)).toEqual(['Maria', 'Carlos'])
  })

  it('retorna vazio quando tudo está pago ou no futuro', () => {
    const vendas = [
      { id: 'v1', clienteId: 'c1', parcelas: [ parcela(1, '2026-08-01') ] },
      { id: 'v2', clienteId: 'c2', parcelas: [ parcela(1, '2026-07-01', { pago: true, pagoEm: '2026-07-01' }) ] },
    ]
    expect(construirFilaCobranca(vendas, clientes, HOJE, AGORA)).toEqual([])
  })

  it('ignora venda de cliente inexistente', () => {
    const vendas = [ { id: 'v1', clienteId: 'zzz', parcelas: [ parcela(1, '2026-07-01') ] } ]
    expect(construirFilaCobranca(vendas, clientes, HOJE, AGORA)).toEqual([])
  })
})
