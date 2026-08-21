// Cliente da API do convite (PHP + MySQL na HostGator).
// Em dev o next.config.js encaminha /api/* para o backend local (ver rewrites);
// em produção o front e a API ficam na mesma origem.

const API_BASE = '/api'
const TOKEN_KEY = 'nivergio.admin.token'

// sessionStorage e não localStorage: o token do painel morre ao fechar a aba.
// Num celular emprestado, uma sessão de organizador não fica aberta para sempre.
export function getToken() {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (typeof window === 'undefined') return
  if (token) window.sessionStorage.setItem(TOKEN_KEY, token)
  else window.sessionStorage.removeItem(TOKEN_KEY)
}

// Erro com nome próprio para o painel distinguir "sessão caiu, volte ao login"
// de "deu erro, tente de novo" sem inspecionar texto de mensagem.
export class SessionExpiredError extends Error {
  constructor() {
    super('Sessão expirada. Entre de novo.')
    this.name = 'SessionExpiredError'
  }
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) headers.Authorization = `Bearer ${getToken()}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)

  // O 401 é tratado em um lugar só: derruba a sessão aqui, e cada tela apenas
  // reage ao erro com nome — em vez de nove componentes adivinhando o que houve.
  if (auth && res.status === 401) {
    setToken('')
    throw new SessionExpiredError()
  }
  if (!res.ok || !data) {
    throw new Error(data?.error || 'Erro ao comunicar com o servidor.')
  }
  return data
}

export function lookupGroup({ code }) {
  const params = new URLSearchParams({ code })
  return request(`/rsvp?${params.toString()}`)
}

export function confirmGroup({ code, responses }) {
  return request('/rsvp', { method: 'POST', body: { code, responses } })
}

export async function adminLogin({ password }) {
  const data = await request('/admin/login', { method: 'POST', body: { password } })
  setToken(data.token)
  return data
}

export async function adminLogout() {
  try {
    await request('/admin/logout', { method: 'POST', body: {}, auth: true })
  } finally {
    // O token sai do navegador mesmo se a chamada falhar: por o servidor já ter
    // expirado a sessão, por queda de rede, tanto faz — sair tem de sair.
    setToken('')
  }
}

export function fetchGroups() {
  return request('/admin/groups', { auth: true })
}

export function createGroup({ responsible, companions, phone }) {
  return request('/admin/groups/create', {
    method: 'POST',
    body: { responsible, companions, phone },
    auth: true,
  })
}

export function updateGroup({ id, responsible, companions, phone }) {
  return request('/admin/groups/update', {
    method: 'POST',
    body: { id, responsible, companions, phone },
    auth: true,
  })
}

export function deleteGroup({ id }) {
  return request('/admin/groups/delete', { method: 'POST', body: { id }, auth: true })
}

export function setMessageSent({ id, sent }) {
  return request('/admin/groups/message-sent', { method: 'POST', body: { id, sent }, auth: true })
}
