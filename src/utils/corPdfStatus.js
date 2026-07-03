import { statusParcela } from './formatadores.js'

const CORES_PDF = {
  pago:    { bg: [220, 252, 231], texto: [21, 128, 61] },
  atraso:  { bg: [254, 226, 226], texto: [185, 28, 28] },
  hoje:    { bg: [255, 237, 213], texto: [194, 65, 12] },
  proximo: { bg: [254, 249, 195], texto: [161, 98, 7] },
  normal:  { bg: [243, 244, 246], texto: [100, 100, 100] },
}

export function corPdfStatusParcela(parcela) {
  const st = statusParcela(parcela)
  const cores = CORES_PDF[st.tier]
  return { label: st.label, bg: cores.bg, texto: cores.texto }
}
