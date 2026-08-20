// Cliente para a API de confirmação de presença (PHP + MySQL na HostGator).
// Em dev, o next.config.js encaminha /api/* para o domínio já publicado
// (ver rewrites) — em produção o front e a API ficam na mesma origem.

const API_BASE = '/api'

async function request(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options)
  const data = await res.json().catch(() => null)
  if (!res.ok || !data) {
    throw new Error(data?.error || 'Erro ao comunicar com o servidor.')
  }
  return data
}

export function lookupRsvp({ email }) {
  const params = new URLSearchParams({ email })
  return request(`/rsvp?${params.toString()}`)
}

export function saveRsvp({ email, name, companions }) {
  return request('/rsvp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, companions }),
  })
}

export function fetchAdminRsvps({ password }) {
  return request('/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
}
