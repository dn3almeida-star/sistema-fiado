export function iniciarChecagemDeAtualizacao(aoDetectarNovaVersao) {
  if (!import.meta.env.PROD) return () => {}

  const scriptAtual = document.querySelector('script[type="module"]')?.getAttribute('src')

  async function checar() {
    try {
      const resposta = await fetch('/', { cache: 'no-store' })
      const html = await resposta.text()
      const match = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/)
      const scriptNovo = match?.[1]
      if (scriptNovo && scriptAtual && scriptNovo !== scriptAtual) {
        aoDetectarNovaVersao()
      }
    } catch {
      // sem internet ou erro de rede — tenta de novo na próxima checagem
    }
  }

  function aoFicarVisivel() {
    if (document.visibilityState === 'visible') checar()
  }

  document.addEventListener('visibilitychange', aoFicarVisivel)
  window.addEventListener('focus', checar)
  const intervalo = setInterval(checar, 15 * 60 * 1000)

  return () => {
    document.removeEventListener('visibilitychange', aoFicarVisivel)
    window.removeEventListener('focus', checar)
    clearInterval(intervalo)
  }
}
