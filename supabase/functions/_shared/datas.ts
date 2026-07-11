// Helpers de data compartilhados entre Edge Functions (padrão _shared do Supabase).
// Sem I/O — testável com Vitest via datas.test.js.

export const DIAS_ASSINATURA = 30

// 'en-CA' formata como 'YYYY-MM-DD'; timeZone garante o dia correto em SP.
export function dataSaoPaulo(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date)
}

// hoje + N dias em aritmética de calendário local (nunca toISOString, que
// escorrega o dia em fuso negativo).
export function calcularExpiracao(hojeISO: string, dias = DIAS_ASSINATURA): string {
  const [ano, mes, dia] = hojeISO.split('-').map(Number)
  const d = new Date(ano, mes - 1, dia + dias)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
