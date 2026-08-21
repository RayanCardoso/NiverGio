import InviteActions from './InviteActions.jsx'
import { GROUP_STATUS_LABEL, groupScore, groupStatus, responsibleName } from './groupStats.js'
import { formatDateTime, formatPhone } from './format.js'
import './GroupRow.css'

const STATUS_TEXT = {
  yes: 'vem',
  no: 'não vem',
  pending: 'não respondeu',
}

function GroupRow({ group, expanded, onToggle, onEdit, onDelete, onToggleSent, busy }) {
  const name = responsibleName(group)
  const score = groupScore(group)
  const status = groupStatus(group)

  return (
    <>
      <tr className="group-row">
        <td className="group-row__name">
          <button type="button" className="group-row__toggle" onClick={onToggle} aria-expanded={expanded}>
            <span className="group-row__caret" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
            {name}
          </button>
          {group.phone && <span className="group-row__phone">{formatPhone(group.phone)}</span>}
        </td>

        <td className="group-row__num">{score.total}</td>

        <td className="group-row__score">
          <span className="group-row__score-yes">{score.yes}</span>
          <span className="group-row__score-sep">/</span>
          <span>{score.total}</span>
        </td>

        <td>
          <span className={`group-row__pill group-row__pill--${status}`}>
            {GROUP_STATUS_LABEL[status]}
          </span>
        </td>

        {/* O código curto aparece: é o que o organizador dita por telefone
            quando alguém perde o link. O GUID, não. */}
        <td className="group-row__code">{group.short_code}</td>

        <td>
          <label className="group-row__sent">
            <input
              type="checkbox"
              checked={Boolean(group.message_sent_at)}
              onChange={(event) => onToggleSent(event.target.checked)}
              disabled={busy}
            />
            <span>{group.message_sent_at ? formatDateTime(group.message_sent_at) : 'não enviado'}</span>
          </label>
        </td>

        <td className="group-row__actions">
          <InviteActions group={group} name={name} />
          <button type="button" className="group-row__button" onClick={onEdit}>
            Editar
          </button>
          <button type="button" className="group-row__button group-row__button--danger" onClick={onDelete}>
            Apagar
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="group-row__details">
          <td colSpan={7}>
            <ul className="group-row__members">
              {group.members.map((member) => (
                <li className="group-row__member" key={member.id}>
                  <span className={`group-row__dot group-row__dot--${member.status}`} aria-hidden="true" />
                  <span className="group-row__member-name">{member.name}</span>
                  {member.is_responsible && <span className="group-row__tag">responsável</span>}
                  <span className={`group-row__member-status group-row__member-status--${member.status}`}>
                    {STATUS_TEXT[member.status]}
                  </span>
                  <span className="group-row__member-date">{formatDateTime(member.responded_at)}</span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  )
}

export default GroupRow
