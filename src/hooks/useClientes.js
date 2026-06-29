import { useState, useEffect } from 'react'

const CHAVE = 'caderno_clientes'

export function useClientes() {
  const [clientes, setClientes] = useState(() => {
    try {
      const raw = localStorage.getItem(CHAVE)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(CHAVE, JSON.stringify(clientes))
  }, [clientes])

  function adicionarCliente(dados) {
    const novo = {
      id: crypto.randomUUID(),
      criadoEm: new Date().toISOString(),
      nome: '',
      telefone: '',
      endereco: '',
      bairro: '',
      observacoes: '',
      ...dados,
    }
    setClientes(prev => [...prev, novo])
    return novo.id
  }

  function atualizarCliente(id, patch) {
    setClientes(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
  }

  function removerCliente(id) {
    setClientes(prev => prev.filter(c => c.id !== id))
  }

  return { clientes, adicionarCliente, atualizarCliente, removerCliente }
}
