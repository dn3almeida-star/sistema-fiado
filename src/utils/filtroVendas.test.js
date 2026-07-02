process.env.TZ = 'America/Sao_Paulo'

import { describe, it, expect } from 'vitest'
import { vendaNoPeriodo } from './filtroVendas.js'

describe('vendaNoPeriodo', () => {
  it('dia: bate quando a data local exata coincide', () => {
    const venda = { criadaEm: '2026-07-15T10:00:00Z' }
    expect(vendaNoPeriodo(venda, 'dia', '2026-07-15')).toBe(true)
  })

  it('dia: nao bate em outro dia', () => {
    const venda = { criadaEm: '2026-07-15T10:00:00Z' }
    expect(vendaNoPeriodo(venda, 'dia', '2026-07-16')).toBe(false)
  })

  it('dia: usa data LOCAL, nao UTC (fronteira de fuso horario)', () => {
    // 2026-07-16T01:00:00Z em America/Sao_Paulo (UTC-3) é 2026-07-15 22:00 local.
    // Se a implementação usasse UTC em vez de local, esse teste falharia.
    const venda = { criadaEm: '2026-07-16T01:00:00Z' }
    expect(vendaNoPeriodo(venda, 'dia', '2026-07-15')).toBe(true)
    expect(vendaNoPeriodo(venda, 'dia', '2026-07-16')).toBe(false)
  })

  it('mes: bate em qualquer dia do mesmo mes', () => {
    const venda = { criadaEm: '2026-07-01T10:00:00Z' }
    expect(vendaNoPeriodo(venda, 'mes', '2026-07')).toBe(true)
  })

  it('mes: nao bate em outro mes', () => {
    const venda = { criadaEm: '2026-07-31T23:59:00Z' }
    expect(vendaNoPeriodo(venda, 'mes', '2026-08')).toBe(false)
  })

  it('ano: bate em qualquer mes do mesmo ano', () => {
    const venda = { criadaEm: '2026-01-05T10:00:00Z' }
    expect(vendaNoPeriodo(venda, 'ano', '2026')).toBe(true)
  })

  it('ano: nao bate em outro ano', () => {
    const venda = { criadaEm: '2026-12-31T23:59:00Z' }
    expect(vendaNoPeriodo(venda, 'ano', '2027')).toBe(false)
  })

  it('valor vazio retorna true (sem filtro aplicado ainda)', () => {
    const venda = { criadaEm: '2026-07-15T10:00:00Z' }
    expect(vendaNoPeriodo(venda, 'dia', '')).toBe(true)
    expect(vendaNoPeriodo(venda, 'mes', '')).toBe(true)
    expect(vendaNoPeriodo(venda, 'ano', '')).toBe(true)
  })
})
