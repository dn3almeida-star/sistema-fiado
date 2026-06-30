export function perfilCompleto(profile) {
  return Boolean(profile && typeof profile.nome_loja === 'string' && profile.nome_loja.trim())
}
