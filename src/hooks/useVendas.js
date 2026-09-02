import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { aplicarPagamentoParcela, desfazerPagamentoParcela } from '../utils/pagamentoParcela.js'

const SELECT = 'id, clienteId:cliente_id, itens, valorTotal:valor_total, entrada, parcelas, criadaEm:criada_em'

export function useVendas(usuario) {
  const [vendas, setVendas] = useState([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    if (!usuario) {
      setVendas([])
      setCarregando(false)
      return
    }
    const { data, error } = await supabase
      .from('vendas')
      .select(SELECT)
      .order('criada_em', { ascending: false })
    if (!error) setVendas(data ?? [])
    setCarregando(false)
  }, [usuario])

  useEffect(() => {
    setCarregando(true)
    recarregar()
  }, [recarregar])

  async function adicionarVenda(dados) {
    const { data, error } = await supabase
      .from('vendas')
      .insert({
        cliente_id: dados.clienteId,
        itens: dados.itens,
        valor_total: dados.valorTotal,
        entrada: dados.entrada ?? 0,
        parcelas: dados.parcelas ?? [],
      })
      .select(SELECT)
      .single()
    if (error) throw error
    setVendas(prev => [data, ...prev])
    return data.id
  }

  async function atualizarParcelas(vendaId, novasParcelas) {
    const { error } = await supabase
      .from('vendas')
      .update({ parcelas: novasParcelas })
      .eq('id', vendaId)
    if (error) throw error
    setVendas(prev =>
      prev.map(v => (v.id === vendaId ? { ...v, parcelas: novasParcelas } : v))
    )
  }

  async function atualizarParcelasEValorTotal(vendaId, novasParcelas, novoValorTotal) {
    const { error } = await supabase
      .from('vendas')
      .update({ parcelas: novasParcelas, valor_total: novoValorTotal })
      .eq('id', vendaId)
    if (error) throw error
    setVendas(prev =>
      prev.map(v => (v.id === vendaId ? { ...v, parcelas: novasParcelas, valorTotal: novoValorTotal } : v))
    )
  }

  async function marcarParcelaPaga(vendaId, numeroParcela, valorPago) {
    const venda = vendas.find(v => v.id === vendaId)
    if (!venda) return
    const parcelaAtual = venda.parcelas.find(p => p.numero === numeroParcela)
    if (!parcelaAtual) return

    const valorFinal = valorPago ?? parcelaAtual.valor
    const { parcelas: novas, parcelaExtraCriada, diferenca } = aplicarPagamentoParcela(
      venda.parcelas,
      numeroParcela,
      valorFinal,
      new Date().toISOString()
    )

    if (parcelaExtraCriada) {
      const novoValorTotal = Math.round((venda.valorTotal + diferenca) * 100) / 100
      await atualizarParcelasEValorTotal(vendaId, novas, novoValorTotal)
    } else {
      await atualizarParcelas(vendaId, novas)
    }
  }

  async function desmarcarParcelaPaga(vendaId, numeroParcela) {
    const venda = vendas.find(v => v.id === vendaId)
    if (!venda) return
    const { parcelas: novas, parcelaRemovida, diferencaRevertida } = desfazerPagamentoParcela(
      venda.parcelas,
      numeroParcela
    )

    if (parcelaRemovida) {
      const novoValorTotal = Math.round((venda.valorTotal - diferencaRevertida) * 100) / 100
      await atualizarParcelasEValorTotal(vendaId, novas, novoValorTotal)
    } else {
      await atualizarParcelas(vendaId, novas)
    }
  }

  async function alterarVencimento(vendaId, numeroParcela, novoVencimento) {
    const venda = vendas.find(v => v.id === vendaId)
    if (!venda) return
    const novas = venda.parcelas.map(p =>
      p.numero === numeroParcela ? { ...p, vencimento: novoVencimento } : p
    )
    await atualizarParcelas(vendaId, novas)
  }

  async function registrarCobranca(vendaId, numeroParcela) {
    const venda = vendas.find(v => v.id === vendaId)
    if (!venda) return
    const novas = venda.parcelas.map(p =>
      p.numero === numeroParcela
        ? { ...p, ultimaCobrancaEm: new Date().toISOString() }
        : p
    )
    await atualizarParcelas(vendaId, novas)
  }

  async function removerVenda(id) {
    const { error } = await supabase.from('vendas').delete().eq('id', id)
    if (error) throw error
    setVendas(prev => prev.filter(v => v.id !== id))
  }

  return {
    vendas,
    carregandoVendas: carregando,
    adicionarVenda,
    marcarParcelaPaga,
    desmarcarParcelaPaga,
    alterarVencimento,
    registrarCobranca,
    removerVenda,
  }
}
