import { useCallback, useEffect, useState } from 'react'
import Sparkles from '../components/Sparkles.jsx'
import { lookupGroup, confirmGroup } from '../api.js'
import './ConfirmPresencaPage.css'

const CODE_LENGTH = 6

function ConfirmPresencaPage({ code: linkCode, onBack }) {
  // Quem chegou pelo link já entra carregando; a tela de digitar código é o
  // plano B de quem perdeu a mensagem.
  const [step, setStep] = useState(linkCode ? 'loading' : 'code')
  const [code, setCode] = useState(linkCode || '')
  const [codeInput, setCodeInput] = useState('')
  const [members, setMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async (rawCode) => {
    setStep('loading')
    setErrorMessage('')
    try {
      const data = await lookupGroup({ code: rawCode })
      if (!data.found) {
        setStep('code')
        setErrorMessage('Código não encontrado. Confira o link que você recebeu.')
        return
      }
      setCode(rawCode)
      setMembers(data.members)
      setStep('list')
    } catch (err) {
      setStep('code')
      setErrorMessage(err.message)
    }
  }, [])

  useEffect(() => {
    if (linkCode) load(linkCode)
  }, [linkCode, load])

  const answered = members.filter((member) => member.status !== 'pending').length
  const missing = members.length - answered
  const going = members.filter((member) => member.status === 'yes').length
  const responsible = members.find((member) => member.is_responsible)

  const handleCodeSubmit = (event) => {
    event.preventDefault()
    const typed = codeInput.trim().toUpperCase()
    if (typed.length !== CODE_LENGTH) {
      setErrorMessage(`O código do convite tem ${CODE_LENGTH} caracteres.`)
      return
    }
    load(typed)
  }

  const answer = (id, status) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === id ? { ...member, status } : member)),
    )
  }

  const handleConfirm = async () => {
    setSaving(true)
    setErrorMessage('')
    try {
      const data = await confirmGroup({
        code,
        responses: members.map((member) => ({ id: member.id, status: member.status })),
      })
      setMembers(data.members)
      setStep('done')
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setSaving(false)
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

        {step === 'loading' && (
          <div className="confirm-page__card">
            <p className="confirm-page__hint">Buscando seu convite…</p>
          </div>
        )}

        {step === 'code' && (
          <form className="confirm-page__card" onSubmit={handleCodeSubmit}>
            <p className="confirm-page__hint">
              Digite o código que está no convite que você recebeu.
            </p>

            <label className="confirm-page__label" htmlFor="invite-code">
              Código do convite
            </label>
            <input
              id="invite-code"
              className="confirm-page__input confirm-page__input--code"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
              placeholder="ABC123"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={CODE_LENGTH}
              required
            />

            {errorMessage && <p className="confirm-page__error">{errorMessage}</p>}

            <button type="submit" className="confirm-page__submit">
              Abrir convite
            </button>
          </form>
        )}

        {step === 'list' && (
          <div className="confirm-page__card">
            <p className="confirm-page__greeting">
              Oi, {responsible ? responsible.name.split(' ')[0] : 'você'}! 👋
            </p>
            <p className="confirm-page__hint">Quem do seu grupo vai à festa?</p>

            <ul className="confirm-page__members">
              {members.map((member) => (
                <li className="confirm-page__member" key={member.id}>
                  <span className="confirm-page__member-name">{member.name}</span>
                  <span className="confirm-page__member-actions">
                    <button
                      type="button"
                      className={`confirm-page__answer confirm-page__answer--yes${
                        member.status === 'yes' ? ' is-active' : ''
                      }`}
                      onClick={() => answer(member.id, 'yes')}
                      aria-pressed={member.status === 'yes'}
                    >
                      Vai
                    </button>
                    <button
                      type="button"
                      className={`confirm-page__answer confirm-page__answer--no${
                        member.status === 'no' ? ' is-active' : ''
                      }`}
                      onClick={() => answer(member.id, 'no')}
                      aria-pressed={member.status === 'no'}
                    >
                      Não vai
                    </button>
                  </span>
                </li>
              ))}
            </ul>

            <p className="confirm-page__total">
              {going === 0
                ? 'Ninguém marcado ainda'
                : `${going} de ${members.length} ${going === 1 ? 'confirmado' : 'confirmados'}`}
            </p>

            {errorMessage && <p className="confirm-page__error">{errorMessage}</p>}

            <button
              type="button"
              className="confirm-page__submit"
              onClick={handleConfirm}
              disabled={saving || missing > 0}
            >
              {saving ? 'Enviando…' : 'Enviar resposta'}
            </button>

            {/* Resposta pela metade deixaria o organizador com número aberto,
                então o aviso diz exatamente quantos faltam. */}
            {missing > 0 && (
              <p className="confirm-page__pending">
                {missing === 1
                  ? 'Falta responder por 1 pessoa'
                  : `Falta responder por ${missing} pessoas`}
              </p>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="confirm-page__card">
            <p className="confirm-page__greeting">Resposta enviada! 🎉</p>
            <p className="confirm-page__hint">
              {going === 0
                ? 'Que pena! Sentiremos sua falta.'
                : `${going} ${going === 1 ? 'lugar guardado' : 'lugares guardados'}. Nos vemos na festa!`}
            </p>
            <button
              type="button"
              className="confirm-page__submit"
              onClick={() => setStep('list')}
            >
              Editar resposta
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConfirmPresencaPage
