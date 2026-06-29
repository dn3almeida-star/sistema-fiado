import { useState, useEffect } from 'react'

const CHAVE = 'caderno_vendas'

export function useVendas() {
  const [vendas, setVendas] = useState(() => {
    try {
      const raw = localStorage.getItem(CHAVE)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(CHAVE, JSON.stringify(vendas))
  }, [vendas])

  function adicionarVenda(dados) {
    const nova = {
      id: crypto.randomUUID(),
      criadaEm: new Date().toISOString(),
      clienteId: '',
      itens: '',
      valorTotal: 0,
      entrada: 0,
      parcelas: [],
      ...dados,
    }
    setVendas(prev => [...prev, nova])
    return nova.id
  }

  function marcarParcelaPaga(vendaId, numeroParcela) {
    setVendas(prev =>
      prev.map(v => {
        if (v.id !== vendaId) return v
        return {
          ...v,
          parcelas: v.parcelas.map(p =>
            p.numero === numeroParcela
              ? { ...p, pago: true, pagoEm: new Date().toISOString() }
              : p
          ),
        }
      })
    )
  }

  function desmarcarParcelaPaga(vendaId, numeroParcela) {
    setVendas(prev =>
      prev.map(v => {
        if (v.id !== vendaId) return v
        return {
          ...v,
          parcelas: v.parcelas.map(p =>
            p.numero === numeroParcela ? { ...p, pago: false, pagoEm: null } : p
          ),
        }
      })
    )
  }

  function removerVenda(id) {
    setVendas(prev => prev.filter(v => v.id !== id))
  }

  return { vendas, adicionarVenda, marcarParcelaPaga, desmarcarParcelaPaga, removerVenda }
}
