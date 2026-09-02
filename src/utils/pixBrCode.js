/**
 * Monta o "PIX Copia e Cola" (BR Code) do padrao do Banco Central.
 *
 * O codigo e uma sequencia de campos TLV: cada um declara seu id, o tamanho do
 * conteudo e o conteudo. No fim vai um CRC — se ele estiver errado por um
 * digito, o banco recusa o codigo inteiro.
 */

const NOME_MAX = 25
const CIDADE_MAX = 15

// id + tamanho (2 digitos) + valor
function tlv(id, valor) {
  const v = String(valor)
  return `${id}${String(v.length).padStart(2, '0')}${v}`
}

// O padrao nao aceita acento: o banco da cliente pode exibir lixo no lugar.
function normalizar(texto, maximo) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .slice(0, maximo)
}

// CRC-16/CCITT-FALSE: polinomio 0x1021, inicial 0xFFFF, sem reflexao.
export function crc16(payload) {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * @param {{chave: string, nome?: string, cidade?: string, valor?: number|null}} dados
 * @returns {string|null} o codigo pronto, ou null se nao houver chave
 */
export function gerarBrCodePix({ chave, nome, cidade, valor }) {
  const chaveLimpa = (chave || '').trim()
  if (!chaveLimpa) return null

  const merchantAccount = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', chaveLimpa)

  let payload =
    tlv('00', '01') +                          // formato do payload
    tlv('26', merchantAccount) +               // arranjo Pix + chave
    tlv('52', '0000') +                        // categoria do estabelecimento
    tlv('53', '986')                           // moeda: real

  if (valor != null && Number(valor) > 0) {
    payload += tlv('54', Number(valor).toFixed(2))
  }

  payload +=
    tlv('58', 'BR') +                                          // pais
    tlv('59', normalizar(nome, NOME_MAX) || 'N/A') +           // recebedor
    tlv('60', normalizar(cidade, CIDADE_MAX) || 'N/A') +       // cidade
    tlv('62', tlv('05', '***'))                                // id da transacao

  const comAberturaCrc = `${payload}6304`
  return comAberturaCrc + crc16(comAberturaCrc)
}
