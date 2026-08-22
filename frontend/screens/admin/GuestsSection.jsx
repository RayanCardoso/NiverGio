import { useMemo, useState } from 'react'
import { createGroup, deleteGroup, SessionExpiredError, setMessageSent, updateGroup } from '../../api.js'
import GroupForm from './GroupForm.jsx'
import GroupRow from './GroupRow.jsx'
import { GROUP_STATUS, GROUP_STATUS_LABEL, groupStatus, responsibleName } from './groupStats.js'
import { formatDateTime, formatPhone } from './format.js'
import './GuestsSection.css'

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: GROUP_STATUS.naoEnviado, label: GROUP_STATUS_LABEL[GROUP_STATUS.naoEnviado] },
  { id: GROUP_STATUS.aguardando, label: GROUP_STATUS_LABEL[GROUP_STATUS.aguardando] },
  { id: GROUP_STATUS.parcial, label: GROUP_STATUS_LABEL[GROUP_STATUS.parcial] },
  { id: GROUP_STATUS.respondido, label: GROUP_STATUS_LABEL[GROUP_STATUS.respondido] },
]

const STATUS_CSV = { yes: 'vem', no: 'nao vem', pending: 'nao respondeu' }

function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`
}

function GuestsSection({ groups, filter, onFilterChange, onReload, onSessionExpired }) {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [expandedId, setExpandedId] = useState(0)
  const [busyId, setBusyId] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (groups || []).filter((group) => {
      if (filter !== 'todos' && groupStatus(group) !== filter) return false
      if (!term) return true
      return group.members.map((member) => member.name).join(' ').toLowerCase().includes(term)
    })
  }, [groups, filter, search])

  const run = async (action) => {
    setErrorMessage('')
    try {
      await action()
      await onReload()
    } catch (err) {
      // Sessão caiu: o token já foi apagado pelo api.js. Não renderiza texto
      // vermelho aqui (nem deixa a exceção chegar ao GroupForm, que também
      // mostra erro) — devolve o organizador para o login, painel morto é
      // pior do que uma tela de login inesperada.
      if (err instanceof SessionExpiredError) {
        onSessionExpired(err.message)
        return
      }
      setErrorMessage(err.message)
      throw err
    }
  }

  const handleSubmit = async (values) => {
    if (editing) {
      await run(() => updateGroup({ id: editing.id, ...values }))
      setEditing(null)
      return
    }
    await run(() => createGroup(values))
  }

  const handleDelete = (group) => {
    // confirm() nativo porque apagar é irreversível e leva os convidados junto:
    // um clique errado numa lista densa não pode custar uma família inteira.
    if (!window.confirm(`Apagar o grupo de ${responsibleName(group)} e todos os convidados dele?`)) {
      return
    }
    run(() => deleteGroup({ id: group.id })).catch(() => {})
  }

  const handleToggleSent = (group, sent) => {
    setBusyId(group.id)
    run(() => setMessageSent({ id: group.id, sent }))
      .catch(() => {})
      .finally(() => setBusyId(0))
  }

  const handleExportCsv = () => {
    const header = [
      'Responsavel',
      'Telefone',
      'Pessoa',
      'E responsavel',
      'Status',
      'Respondido em',
      'Convite enviado em',
    ]

    // Uma linha por pessoa: é assim que dá para somar e filtrar no Excel. Sem
    // o GUID nem o código curto de propósito — planilha circula por email e
    // grupo, e quem tem qualquer um dos dois confirma presença pela família
    // (o código curto resolve o grupo e escreve nele tanto quanto o GUID).
    const rows = []
    filtered.forEach((group) => {
      const head = responsibleName(group)
      group.members.forEach((member) => {
        rows.push([
          head,
          formatPhone(group.phone),
          member.name,
          member.is_responsible ? 'sim' : 'nao',
          STATUS_CSV[member.status],
          formatDateTime(member.responded_at),
          formatDateTime(group.message_sent_at),
        ])
      })
    })

    // BOM + ponto e vírgula: é assim que o Excel em pt-BR abre com acento certo.
    const csv = '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'convidados.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="guests">
      <GroupForm group={editing} onSubmit={handleSubmit} onCancel={() => setEditing(null)} />

      <div className="guests__toolbar">
        <input
          className="guests__search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome…"
          autoComplete="off"
        />

        <div className="guests__filters">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`guests__filter${filter === item.id ? ' is-active' : ''}`}
              onClick={() => onFilterChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="guests__export"
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
        >
          Exportar CSV
        </button>
      </div>

      {errorMessage && <p className="guests__error">{errorMessage}</p>}

      {(filter !== 'todos' || search) && (
        <p className="guests__note">
          Mostrando {filtered.length} de {groups.length} grupos · o CSV exporta só o que está
          filtrado.
        </p>
      )}

      <div className="guests__table-wrap">
        <table className="guests__table">
          <thead>
            <tr>
              <th>Responsável</th>
              <th className="guests__num">Pessoas</th>
              <th className="guests__num">Confirmados</th>
              <th>Status</th>
              <th>Código</th>
              <th>Convite enviado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((group) => (
              <GroupRow
                key={group.id}
                group={group}
                expanded={expandedId === group.id}
                busy={busyId === group.id}
                onToggle={() => setExpandedId(expandedId === group.id ? 0 : group.id)}
                onEdit={() => setEditing(group)}
                onDelete={() => handleDelete(group)}
                onToggleSent={(sent) => handleToggleSent(group, sent)}
              />
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="guests__empty">
            {groups.length === 0
              ? 'Nenhum grupo cadastrado ainda. Comece pelo formulário acima.'
              : 'Nenhum grupo para esse filtro.'}
          </p>
        )}
      </div>
    </div>
  )
}

export default GuestsSection
