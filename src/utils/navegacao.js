import { obterComPrazo, salvarComPrazo, limparComPrazo } from './armazenamentoTemporario.js'

const CHAVE_ARMAZENAMENTO = 'navegacaoAtual'

export function validarNavegacao(dados) {
  if (!dados || typeof dados.paginaAtiva !== 'string') return null
  return {
    paginaAtiva: dados.paginaAtiva,
    clienteAtivoId: dados.clienteAtivoId ?? null,
    vendaParaCliente: dados.vendaParaCliente ?? null,
  }
}

export function salvarNavegacao(estado) {
  salvarComPrazo(CHAVE_ARMAZENAMENTO, {
    paginaAtiva: estado.paginaAtiva,
    clienteAtivoId: estado.clienteAtivoId ?? null,
    vendaParaCliente: estado.vendaParaCliente ?? null,
  })
}

export function obterNavegacaoSalva() {
  return validarNavegacao(obterComPrazo(CHAVE_ARMAZENAMENTO))
}

export function limparNavegacaoSalva() {
  limparComPrazo(CHAVE_ARMAZENAMENTO)
}
