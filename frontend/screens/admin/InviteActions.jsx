import { useState } from 'react'
import { inviteMessage, whatsappUrl } from './inviteMessage.js'
import './InviteActions.css'

// O GUID nunca aparece escrito na tela: ele é credencial, não informação. Sai
// daqui só dentro do texto copiado e do href do WhatsApp.
function InviteActions({ group, name }) {
  const [copied, setCopied] = useState(false)

  const message = inviteMessage({ name, guid: group.guid })
  const url = whatsappUrl({ phone: group.phone, message })

  const handleCopy = () => {
    navigator.clipboard
      .writeText(message)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  return (
    <span className="invite-actions">
      <button type="button" className="invite-actions__button" onClick={handleCopy}>
        {copied ? 'Copiado ✓' : 'Copiar mensagem'}
      </button>

      {url ? (
        <a
          className="invite-actions__button invite-actions__button--wa"
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
      ) : (
        <span className="invite-actions__muted">sem telefone</span>
      )}
    </span>
  )
}

export default InviteActions
