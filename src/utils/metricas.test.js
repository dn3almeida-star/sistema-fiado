process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { taxasFunil } from './metricas.js'

describe('taxasFunil', () => {
  it('calcula % de ativação e de pagantes sobre cadastros', () => {
    const t = taxasFunil({ cadastros: 40, ativados: 24, pagantes: 10, emTeste: 20, indicacoes: 5, indicacoesConvertidas: 2 })
    expect(t.taxaAtivacao).toBe(60)
    expect(t.taxaPagantes).toBe(25)
    expect(t.cadastros).toBe(40) // preserva os brutos
  })

  it('sem cadastros: taxas em 0 (não divide por zero)', () => {
    const t = taxasFunil({ cadastros: 0, ativados: 0, pagantes: 0, emTeste: 0, indicacoes: 0, indicacoesConvertidas: 0 })
    expect(t.taxaAtivacao).toBe(0)
    expect(t.taxaPagantes).toBe(0)
  })

  it('arredonda para inteiro', () => {
    const t = taxasFunil({ cadastros: 3, ativados: 1, pagantes: 1 })
    expect(t.taxaAtivacao).toBe(33)  // 1/3 = 33,3 → 33
  })
})
