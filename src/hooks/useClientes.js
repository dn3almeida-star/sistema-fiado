import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useClientes(usuario) {
  const [clientes, setClientes] = useState([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    if (!usuario) {
      setClientes([])
      setCarregando(false)
      return
    }
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome, telefone, endereco, bairro, observacoes')
      .order('nome', { ascending: true })
    if (!error) setClientes(data ?? [])
    setCarregando(false)
  }, [usuario])

  useEffect(() => {
    setCarregando(true)
    recarregar()
  }, [recarregar])

  async function adicionarCliente(dados) {
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nome: dados.nome,
        telefone: dados.telefone ?? '',
        endereco: dados.endereco ?? '',
        bairro: dados.bairro ?? '',
        observacoes: dados.observacoes ?? '',
      })
      .select('id, nome, telefone, endereco, bairro, observacoes')
      .single()
    if (error) throw error
    setClientes(prev =>
      [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome))
    )
    return data.id
  }

  async function atualizarCliente(id, patch) {
    const { error } = await supabase.from('clientes').update(patch).eq('id', id)
    if (error) throw error
    setClientes(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
  }

  async function removerCliente(id) {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) throw error
    setClientes(prev => prev.filter(c => c.id !== id))
  }

  return {
    clientes,
    carregandoClientes: carregando,
    adicionarCliente,
    atualizarCliente,
    removerCliente,
  }
}
