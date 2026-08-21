// O MySQL devolve "2026-08-20 17:07:39". Formatar na mão evita o new Date() com
// string sem timezone, que nem todo navegador interpreta igual.
export function formatDateTime(value) {
  if (!value) return '—'
  const [date, time = ''] = String(value).split(' ')
  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return value
  return time ? `${day}/${month}/${year} ${time.slice(0, 5)}` : `${day}/${month}/${year}`
}

export function formatPhone(value) {
  const digits = String(value || '').replace(/\D+/g, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return digits
}
