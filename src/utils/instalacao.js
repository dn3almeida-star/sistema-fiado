// Decide se (e como) oferecer a instalação do PWA. Função pura: recebe o estado
// já detectado pelo hook e devolve o modo de banner. 'android' = tem o prompt
// nativo (beforeinstallprompt); 'ios' = Safari, precisa de instruções manuais.
export function decidirInstalacao({ instalado, dispensado, podeInstalar, ehIOS }) {
  if (instalado || dispensado) return null
  if (podeInstalar) return 'android'
  if (ehIOS) return 'ios'
  return null
}
