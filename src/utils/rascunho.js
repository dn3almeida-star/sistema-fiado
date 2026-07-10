// Rascunhos de formulário persistidos com prazo (ver armazenamentoTemporario).
// Guardam o que o lojista já digitou num cadastro em andamento, para que ele
// continue de onde parou se o app for encerrado e reaberto dentro do prazo.

export const CHAVE_RASCUNHO_CLIENTE = 'rascunhoCliente'
export const CHAVE_RASCUNHO_VENDA = 'rascunhoVenda'

// Decide se o rascunho de venda salvo deve ser restaurado, dado o cliente que
// possivelmente veio pré-selecionado ao abrir a tela. Se a tela foi aberta para
// um cliente específico diferente do rascunho, o rascunho antigo é ignorado
// (o gesto explícito de "nova venda para o cliente X" vence).
export function deveUsarRascunhoVenda(rascunho, clientePreSelecionado) {
  if (!rascunho) return false
  const preSelecionado = clientePreSelecionado || ''
  return !preSelecionado || rascunho.clienteId === preSelecionado
}
