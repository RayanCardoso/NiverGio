import { useMemo, useState } from 'react'
import { SessionExpiredError, setMessageSent } from '../../api.js'
import InviteActions from './InviteActions.jsx'
import { GROUP_STATUS, groupScore, groupStatus, responsibleName } from './groupStats.js'
import { formatDateTime, formatPhone } from './format.js'
import './SendsSection.css'

function SendsSection({ groups, onReload, onSessionExpired }) {
  const [hideSent, setHideSent] = useState(true)
  const [busyId, setBusyId] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const visible = useMemo(() => {
    const list = groups || []
    if (!hideSent) return list
    return list.filter((group) => !group.message_sent_at)
  }, [groups, hideSent])

  const pending = (groups || []).filter((group) => !group.message_sent_at).length

  const handleToggle = async (group, sent) => {
    setBusyId(group.id)
    setErrorMessage('')
    try {
      await setMessageSent({ id: group.id, sent })
      await onReload()
    } catch (err) {
      // Mesma regra do GuestsSection: sessão caiu vira "volta ao login", não
      // texto vermelho — o token já foi apagado, insistir aqui deixa o
      // painel morto.
      if (err instanceof SessionExpiredError) {
        onSessionExpired(err.message)
        return
      }
      setErrorMessage(err.message)
    } finally {
      setBusyId(0)
    }
  }

  return (
    <div className="sends">
      <div className="sends__head">
        <p className="sends__count">
          {pending === 0
            ? 'Todos os convites já foram enviados 🎉'
            : `${pending} ${pending === 1 ? 'convite' : 'convites'} por enviar`}
        </p>

        <label className="sends__switch">
          <input
            type="checkbox"
            checked={hideSent}
            onChange={(event) => setHideSent(event.target.checked)}
          />
          <span>Esconder quem já recebeu</span>
        </label>
      </div>

      {errorMessage && <p className="sends__error">{errorMessage}</p>}

      <ul className="sends__list">
        {visible.map((group) => {
          const name = responsibleName(group)
          const score = groupScore(group)
          const status = groupStatus(group)

          return (
            <li className="sends__item" key={group.id}>
              <div className="sends__info">
                <p className="sends__name">{name}</p>
                <p className="sends__meta">
                  {score.total} {score.total === 1 ? 'pessoa' : 'pessoas'}
                  {group.phone ? ` · ${formatPhone(group.phone)}` : ' · sem telefone'}
                  {status === GROUP_STATUS.respondido || status === GROUP_STATUS.parcial
                    ? ` · ${score.yes} de ${score.total} confirmados`
                    : ''}
                </p>
              </div>

              <InviteActions group={group} name={name} />

              {/* O check é manual de propósito: copiar o texto não é ter
                  enviado. Se ele acendesse no copiar, o painel mostraria gente
                  marcada como avisada que nunca recebeu nada. */}
              <label className="sends__check">
                <input
                  type="checkbox"
                  checked={Boolean(group.message_sent_at)}
                  onChange={(event) => handleToggle(group, event.target.checked)}
                  disabled={busyId === group.id}
                />
                <span>
                  {group.message_sent_at ? `enviado ${formatDateTime(group.message_sent_at)}` : 'marcar como enviado'}
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      {visible.length === 0 && (
        <p className="sends__empty">
          {(groups || []).length === 0
            ? 'Cadastre um grupo na seção Convidados para começar.'
            : 'Nada por aqui — desmarque "esconder quem já recebeu" para ver a lista toda.'}
        </p>
      )}
    </div>
  )
}

export default SendsSection
