// Persistência local com prazo de validade.
//
// Usa localStorage (sobrevive ao sistema operacional encerrar o app/PWA em
// segundo plano — diferente de sessionStorage, que é apagado nesse caso) e
// carimba cada valor com o instante em que foi salvo. Ao ler, o valor só é
// devolvido se ainda estiver dentro do prazo; caso contrário é tratado como
// inexistente. É isso que dá o comportamento "permanece por um tempo".

export const PRAZO_PADRAO_MS = 30 * 60 * 1000 // 30 minutos

export function empacotarComPrazo(dados, agoraMs) {
  return JSON.stringify({ dados, salvoEm: agoraMs })
}

export function desempacotarComPrazo(bruto, agoraMs, prazoMs) {
  if (!bruto) return null
  let pacote
  try {
    pacote = JSON.parse(bruto)
  } catch {
    return null
  }
  if (!pacote || typeof pacote.salvoEm !== 'number') return null
  if (agoraMs - pacote.salvoEm > prazoMs) return null
  return pacote.dados ?? null
}

export function salvarComPrazo(chave, dados) {
  try {
    localStorage.setItem(chave, empacotarComPrazo(dados, Date.now()))
  } catch {
    /* ignora storage indisponível */
  }
}

export function obterComPrazo(chave, prazoMs = PRAZO_PADRAO_MS) {
  try {
    return desempacotarComPrazo(localStorage.getItem(chave), Date.now(), prazoMs)
  } catch {
    return null
  }
}

export function limparComPrazo(chave) {
  try {
    localStorage.removeItem(chave)
  } catch {
    /* ignora storage indisponível */
  }
}
