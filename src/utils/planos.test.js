process.env.TZ = 'America/Sao_Paulo'
import { describe, it, expect } from 'vitest'
import { statusPlano, podeAdicionarCliente, LIMITE_CLIENTES_GRATIS } from './planos.js'

const HOJE = '2026-07-11'

describe('statusPlano', () => {
  it('plano pago permanente (sem expira): tudo liberado, sem contagem de teste nem de validade', () => {
    const s = statusPlano({ plano: 'pago', testeTerminaEm: '2026-01-01' }, HOJE)
    expect(s.estado).toBe('pago')
    expect(s.diasRestantesTeste).toBe(null)
    expect(s.diasRestantesPago).toBe(null)
    expect(s.entitlements).toEqual({
      cobranca: true, pdf: true, relatorio: true,
      clientesIlimitados: true, limiteClientes: null,
    })
  })

  it('teste dentro do prazo: features pagas liberadas + dias restantes corretos', () => {
    const s = statusPlano({ plano: 'teste', testeTerminaEm: '2026-08-10' }, HOJE)
    expect(s.estado).toBe('teste')
    expect(s.diasRestantesTeste).toBe(30)
    expect(s.entitlements.cobranca).toBe(true)
    expect(s.entitlements.pdf).toBe(true)
    expect(s.entitlements.relatorio).toBe(true)
    expect(s.entitlements.clientesIlimitados).toBe(true)
    expect(s.entitlements.limiteClientes).toBe(null)
  })

  it('teste no último dia (hoje === termina) ainda é teste, com 0 dias restantes', () => {
    const s = statusPlano({ plano: 'teste', testeTerminaEm: HOJE }, HOJE)
    expect(s.estado).toBe('teste')
    expect(s.diasRestantesTeste).toBe(0)
    expect(s.entitlements.cobranca).toBe(true)
  })

  it('teste expirado (termina no passado) vira grátis: features pagas travadas, limite 20', () => {
    const s = statusPlano({ plano: 'teste', testeTerminaEm: '2026-07-10' }, HOJE)
    expect(s.estado).toBe('gratis')
    expect(s.diasRestantesTeste).toBe(null)
    expect(s.entitlements).toEqual({
      cobranca: false, pdf: false, relatorio: false,
      clientesIlimitados: false, limiteClientes: 20,
    })
  })

  it('plano grátis explícito: features pagas travadas, limite 20', () => {
    const s = statusPlano({ plano: 'gratis', testeTerminaEm: null }, HOJE)
    expect(s.estado).toBe('gratis')
    expect(s.entitlements.cobranca).toBe(false)
    expect(s.entitlements.limiteClientes).toBe(20)
  })

  it('fallback seguro: profile null ou plano desconhecido → grátis travado', () => {
    expect(statusPlano(null, HOJE).estado).toBe('gratis')
    expect(statusPlano({}, HOJE).estado).toBe('gratis')
    expect(statusPlano({ plano: 'xpto' }, HOJE).entitlements.cobranca).toBe(false)
  })

  it('pago com validade vigente: liberado, com dias restantes da assinatura', () => {
    const s = statusPlano({ plano: 'pago', planoExpiraEm: '2026-08-10' }, HOJE)
    expect(s.estado).toBe('pago')
    expect(s.diasRestantesPago).toBe(30)
    expect(s.entitlements.cobranca).toBe(true)
  })

  it('pago no último dia de validade (hoje === expira) ainda é pago, 0 dias', () => {
    const s = statusPlano({ plano: 'pago', planoExpiraEm: HOJE }, HOJE)
    expect(s.estado).toBe('pago')
    expect(s.diasRestantesPago).toBe(0)
  })

  it('pago expirado (validade no passado) volta a grátis travado', () => {
    const s = statusPlano({ plano: 'pago', planoExpiraEm: '2026-07-10' }, HOJE)
    expect(s.estado).toBe('gratis')
    expect(s.diasRestantesPago).toBe(null)
    expect(s.entitlements.cobranca).toBe(false)
    expect(s.entitlements.limiteClientes).toBe(20)
  })
})

describe('podeAdicionarCliente', () => {
  const pago = statusPlano({ plano: 'pago' }, HOJE)
  const gratis = statusPlano({ plano: 'gratis' }, HOJE)

  it('ilimitado (pago/teste) sempre permite, mesmo com muitos clientes', () => {
    expect(podeAdicionarCliente(pago, 999)).toBe(true)
  })

  it('grátis permite até o limite e bloqueia a partir dele', () => {
    expect(podeAdicionarCliente(gratis, 19)).toBe(true)
    expect(podeAdicionarCliente(gratis, 20)).toBe(false)
    expect(podeAdicionarCliente(gratis, 21)).toBe(false)
  })

  it('LIMITE_CLIENTES_GRATIS é 20', () => {
    expect(LIMITE_CLIENTES_GRATIS).toBe(20)
  })
})
