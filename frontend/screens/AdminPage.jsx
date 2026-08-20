import { useMemo, useState } from 'react'
import Sparkles from '../components/Sparkles.jsx'
import { fetchAdminRsvps } from '../api.js'
import './AdminPage.css'

// O MySQL devolve "2026-08-20 17:07:39". Formatar na mão evita o new Date()
// com string sem timezone, que nem todo navegador interpreta igual.
function formatDateTime(value) {
  if (!value) return '—'
  const [date, time = ''] = String(value).split(' ')
  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return value
  return time ? `${day}/${month}/${year} ${time.slice(0, 5)}` : `${day}/${month}/${year}`
}

function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`
}

function AdminPage() {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'error'
  const [errorMessage, setErrorMessage] = useState('')
  const [rsvps, setRsvps] = useState(null)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  const load = async (adminPassword) => {
    setStatus('loading')
    setErrorMessage('')
    try {
      const data = await fetchAdminRsvps({ password: adminPassword })
      setRsvps(data.rsvps)
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err.message)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    load(password)
  }

  // Quem confirmou conta como convidado, por isso o +1 em cada grupo.
  const stats = useMemo(() => {
    const list = rsvps || []
    const companions = list.reduce((sum, r) => sum + r.companions.length, 0)
    return {
      people: list.length + companions,
      groups: list.length,
      companions,
      alone: list.filter((r) => r.companions.length === 0).length,
    }
  }, [rsvps])

  const filtered = useMemo(() => {
    const list = rsvps || []
    const term = search.trim().toLowerCase()
    if (!term) return list
    return list.filter((rsvp) =>
      [rsvp.name, rsvp.email, ...rsvp.companions].join(' ').toLowerCase().includes(term),
    )
  }, [rsvps, search])

  const handleCopyEmails = () => {
    navigator.clipboard
      .writeText(filtered.map((rsvp) => rsvp.email).join(', '))
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  const handleExportCsv = () => {
    const header = [
      'Responsavel',
      'Email',
      'Acompanhantes',
      'N de acompanhantes',
      'Total do grupo',
      'Confirmado em',
      'Atualizado em',
    ]
    const rows = filtered.map((rsvp) => [
      rsvp.name,
      rsvp.email,
      rsvp.companions.join(', '),
      rsvp.companions.length,
      rsvp.companions.length + 1,
      formatDateTime(rsvp.created_at),
      formatDateTime(rsvp.updated_at),
    ])
    // BOM + ponto e vírgula: é assim que o Excel em pt-BR abre com acento certo.
    const csv = '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'confirmacoes.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-page">
      <Sparkles />

      <div className="admin-page__content">
        <h1 className="admin-page__title">Confirmações</h1>

        {!rsvps && (
          <form className="admin-page__card" onSubmit={handleSubmit}>
            <label className="admin-page__label" htmlFor="admin-password">
              Senha
            </label>
            <input
              id="admin-password"
              type="password"
              className="admin-page__input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
              required
            />
            {status === 'error' && <p className="admin-page__error">{errorMessage}</p>}
            <button type="submit" className="admin-page__submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        )}

        {rsvps && (
          <>
            <div className="admin-page__stats">
              <div className="admin-page__stat admin-page__stat--highlight">
                <span className="admin-page__stat-value">{stats.people}</span>
                <span className="admin-page__stat-label">pessoas no total</span>
              </div>
              <div className="admin-page__stat">
                <span className="admin-page__stat-value">{stats.groups}</span>
                <span className="admin-page__stat-label">
                  {stats.groups === 1 ? 'confirmação' : 'confirmações'}
                </span>
              </div>
              <div className="admin-page__stat">
                <span className="admin-page__stat-value">{stats.companions}</span>
                <span className="admin-page__stat-label">acompanhantes</span>
              </div>
              <div className="admin-page__stat">
                <span className="admin-page__stat-value">{stats.alone}</span>
                <span className="admin-page__stat-label">vêm sozinhos</span>
              </div>
            </div>

            <div className="admin-page__toolbar">
              <input
                className="admin-page__input admin-page__search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome ou email…"
                autoComplete="off"
              />
              <button type="button" className="admin-page__action" onClick={() => load(password)}>
                {status === 'loading' ? 'Atualizando…' : 'Atualizar'}
              </button>
              <button
                type="button"
                className="admin-page__action"
                onClick={handleCopyEmails}
                disabled={filtered.length === 0}
              >
                {copied ? 'Copiado! ✓' : 'Copiar emails'}
              </button>
              <button
                type="button"
                className="admin-page__action"
                onClick={handleExportCsv}
                disabled={filtered.length === 0}
              >
                Exportar CSV
              </button>
            </div>

            {status === 'error' && <p className="admin-page__error">{errorMessage}</p>}

            {search && (
              <p className="admin-page__filter-note">
                Mostrando {filtered.length} de {rsvps.length} · copiar e exportar valem só para o
                que está filtrado.
              </p>
            )}

            <div className="admin-page__table-wrap">
              <table className="admin-page__table">
                <thead>
                  <tr>
                    <th>Responsável</th>
                    <th>Email</th>
                    <th>Acompanhantes</th>
                    <th className="admin-page__num">Nº</th>
                    <th className="admin-page__num">Grupo</th>
                    <th>Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rsvp) => (
                    <tr key={rsvp.email}>
                      <td className="admin-page__cell-name">{rsvp.name}</td>
                      <td className="admin-page__cell-email">{rsvp.email}</td>
                      <td>
                        {rsvp.companions.length > 0 ? (
                          rsvp.companions.join(', ')
                        ) : (
                          <span className="admin-page__muted">—</span>
                        )}
                      </td>
                      <td className="admin-page__num">{rsvp.companions.length}</td>
                      <td className="admin-page__num admin-page__cell-total">
                        {rsvp.companions.length + 1}
                      </td>
                      <td className="admin-page__cell-date">{formatDateTime(rsvp.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <p className="admin-page__empty">
                  {rsvps.length === 0
                    ? 'Nenhuma confirmação ainda.'
                    : 'Nenhum resultado para essa busca.'}
                </p>
              )}
            </div>
          </>
        )}

        {/* /confirmacao e não /, senão o organizador cai no vídeo de abertura. */}
        <a className="admin-page__back" href="/confirmacao/">
          ← Voltar ao convite
        </a>
      </div>
    </div>
  )
}

export default AdminPage
