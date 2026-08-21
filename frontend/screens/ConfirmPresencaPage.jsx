import { useState } from 'react'
import Sparkles from '../components/Sparkles.jsx'
import { lookupRsvp, saveRsvp } from '../api.js'
import './ConfirmPresencaPage.css'

function ConfirmPresencaPage({ onBack }) {
  const [step, setStep] = useState('identify') // 'identify' | 'edit' | 'done'
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [companions, setCompanions] = useState([])
  const [companionInput, setCompanionInput] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

  // Quem confirma também é convidado, então entra na conta junto com os acompanhantes.
  const totalGuests = companions.length + 1

  const handleIdentify = async (event) => {
    event.preventDefault()
    const guestEmail = email.trim()
    const guestName = name.trim()
    if (!guestEmail || !guestName) return

    setStatus('loading')
    setErrorMessage('')
    try {
      const data = await lookupRsvp({ email: guestEmail })
      setEmail(guestEmail)
      setName(guestName)
      setCompanions(data.found ? data.companions : [])
      setStatus('idle')
      setStep('edit')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err.message)
    }
  }

  const handleAddCompanion = () => {
    const value = companionInput.trim()
    if (!value) return
    setCompanions((prev) => [...prev, value])
    setCompanionInput('')
  }

  const handleCompanionKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAddCompanion()
    }
  }

  const handleRemoveCompanion = (index) => {
    setCompanions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleConfirm = async () => {
    setStatus('loading')
    setErrorMessage('')
    try {
      await saveRsvp({ email, name, companions })
      setStatus('idle')
      setStep('done')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err.message)
    }
  }

  return (
    <div className="confirm-page">
      <Sparkles />

      <div className="confirm-page__content">
        <button type="button" className="confirm-page__back" onClick={onBack}>
          ← Voltar
        </button>

        <h1 className="confirm-page__title">Confirmar presença</h1>

        {step === 'identify' && (
          <form className="confirm-page__card" onSubmit={handleIdentify}>
            <p className="confirm-page__hint">
              Diga seu nome e seu email para confirmar presença.
            </p>

            <label className="confirm-page__label" htmlFor="guest-name">
              Seu nome
            </label>
            <input
              id="guest-name"
              type="text"
              className="confirm-page__input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Como devemos te chamar"
              autoComplete="name"
              maxLength={120}
              required
            />

            <label className="confirm-page__label" htmlFor="guest-email">
              Seu email
            </label>
            <input
              id="guest-email"
              type="email"
              className="confirm-page__input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seuemail@exemplo.com"
              autoComplete="email"
              required
            />

            {status === 'error' && <p className="confirm-page__error">{errorMessage}</p>}

            <button type="submit" className="confirm-page__submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Buscando…' : 'Entrar'}
            </button>
          </form>
        )}

        {step === 'edit' && (
          <div className="confirm-page__card">
            <p className="confirm-page__greeting">Oi, {name}! 👋</p>
            <p className="confirm-page__hint">Quem mais vem com você?</p>

            <ul className="confirm-page__companions">
              <li className="confirm-page__companion confirm-page__companion--you">
                <span>{name}</span>
                <span className="confirm-page__companion-tag">você</span>
              </li>
              {companions.map((companion, index) => (
                <li className="confirm-page__companion" key={`${companion}-${index}`}>
                  <span>{companion}</span>
                  <button
                    type="button"
                    className="confirm-page__companion-remove"
                    onClick={() => handleRemoveCompanion(index)}
                    aria-label={`Remover ${companion}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>

            <div className="confirm-page__add-companion">
              <input
                className="confirm-page__input"
                value={companionInput}
                onChange={(event) => setCompanionInput(event.target.value)}
                onKeyDown={handleCompanionKeyDown}
                placeholder="Nome do acompanhante"
                autoComplete="off"
              />
              <button type="button" className="confirm-page__add-button" onClick={handleAddCompanion}>
                Adicionar
              </button>
            </div>

            <p className="confirm-page__total">
              {totalGuests === 1 ? 'Só você por enquanto' : `${totalGuests} pessoas no total`}
            </p>

            {status === 'error' && <p className="confirm-page__error">{errorMessage}</p>}

            <button
              type="button"
              className="confirm-page__submit"
              onClick={handleConfirm}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Salvando…' : 'Confirmar presença'}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="confirm-page__card">
            <p className="confirm-page__greeting">Presença confirmada! 🎉</p>
            <p className="confirm-page__hint">
              {totalGuests === 1
                ? `Te esperamos, ${name}!`
                : `${totalGuests} lugares guardados. Nos vemos na festa!`}
            </p>
            <button type="button" className="confirm-page__submit" onClick={() => setStep('edit')}>
              Editar confirmação
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConfirmPresencaPage
