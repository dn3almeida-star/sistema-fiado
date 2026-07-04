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
      .select('id, nome, telefone, endereco, bairro, observacoes, cpf')
      .order('nome', { ascending: true })
    if (!error) setClientes(data ?? [])
    setCarregando(false)
  }, [usuario])

  useEffect(() => {
    setCarregando(true)
    recarregar()
  }, [recarregar])

  async function adicionarCliente(dados) {
    const cpfDigitos = (dados.cpf || '').replace(/\D/g, '')
    if (cpfDigitos) {
      const { data: existentes } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('cpf', cpfDigitos)
        .limit(1)
      if (existentes && existentes.length > 0) {
        const err = new Error('cpf_duplicado')
        err.tipo = 'cpf_duplicado'
        err.nome = existentes[0].nome
        throw err
      }
    }
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nome: dados.nome,
        telefone: dados.telefone ?? '',
        endereco: dados.endereco ?? '',
        bairro: dados.bairro ?? '',
        observacoes: dados.observacoes ?? '',
        cpf: cpfDigitos || null,
      })
      .select('id, nome, telefone, endereco, bairro, observacoes, cpf')
      .single()
    if (error) {
      if (error.code === '23505') {
        const err = new Error('cpf_duplicado')
        err.tipo = 'cpf_duplicado'
        err.nome = null
        throw err
      }
      throw error
    }
    setClientes(prev =>
      [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome))
    )
    return data.id
  }

  async function atualizarCliente(id, patch) {
    const patchFinal = { ...patch }
    if ('cpf' in patchFinal) {
      const cpfDigitos = (patchFinal.cpf || '').replace(/\D/g, '')
      patchFinal.cpf = cpfDigitos || null
      if (cpfDigitos) {
        const { data: existentes } = await supabase
          .from('clientes')
          .select('id, nome')
          .eq('cpf', cpfDigitos)
          .neq('id', id)
          .limit(1)
        if (existentes && existentes.length > 0) {
          const err = new Error('cpf_duplicado')
          err.tipo = 'cpf_duplicado'
          err.nome = existentes[0].nome
          throw err
        }
      }
    }
    const { error } = await supabase.from('clientes').update(patchFinal).eq('id', id)
    if (error) {
      if (error.code === '23505') {
        const err = new Error('cpf_duplicado')
        err.tipo = 'cpf_duplicado'
        err.nome = null
        throw err
      }
      throw error
    }
    setClientes(prev => prev.map(c => (c.id === id ? { ...c, ...patchFinal } : c)))
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
