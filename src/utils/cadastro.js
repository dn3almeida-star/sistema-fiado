/**
 * Regras puras do cadastro de lojista (signup + teste grátis).
 * Sem I/O, sem React, sem new Date() interno — datas chegam como 'YYYY-MM-DD'.
 */

export const DIAS_TESTE = 30

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarCadastro({ nomeLoja, email, senha, confirmarSenha }) {
  const erros = {}

  if (!nomeLoja || !nomeLoja.trim()) {
    erros.nomeLoja = 'Informe o nome da sua loja'
  }

  const emailLimpo = (email || '').trim()
  if (!emailLimpo) {
    erros.email = 'Informe seu email'
  } else if (!EMAIL_VALIDO.test(emailLimpo)) {
    erros.email = 'Informe um email válido'
  }

  if (!senha) {
    erros.senha = 'Informe uma senha'
  } else if (senha.length < 6) {
    erros.senha = 'A senha precisa ter pelo menos 6 caracteres'
  } else if (senha !== confirmarSenha) {
    erros.confirmarSenha = 'As senhas não são iguais'
  }

  return { valido: Object.keys(erros).length === 0, erros }
}

// Soma dias a uma data de calendário local ('YYYY-MM-DD' → 'YYYY-MM-DD').
// Aritmética via Date local só para normalizar o calendário; a formatação é
// manual (nunca toISOString, que escorrega o dia em fuso negativo).
export function calcularFimTeste(hojeISO, dias = DIAS_TESTE) {
  const [ano, mes, dia] = hojeISO.split('-').map(Number)
  const alvo = new Date(ano, mes - 1, dia + dias)
  const mm = String(alvo.getMonth() + 1).padStart(2, '0')
  const dd = String(alvo.getDate()).padStart(2, '0')
  return `${alvo.getFullYear()}-${mm}-${dd}`
}
