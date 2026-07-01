import { statusParcela } from './formatadores.js'

const CORES_PDF = {
  'bg-green-100':  { bg: [220, 252, 231], texto: [21, 128, 61] },
  'bg-red-100':    { bg: [254, 226, 226], texto: [185, 28, 28] },
  'bg-orange-100': { bg: [255, 237, 213], texto: [194, 65, 12] },
  'bg-yellow-100': { bg: [254, 249, 195], texto: [161, 98, 7] },
  'bg-surface-2':  { bg: [243, 244, 246], texto: [100, 100, 100] },
}

export function corPdfStatusParcela(parcela) {
  const st = statusParcela(parcela)
  const cores = CORES_PDF[st.bg]
  return { label: st.label, bg: cores.bg, texto: cores.texto }
}
