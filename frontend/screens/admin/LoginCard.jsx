import { useState } from 'react'
import './adminTokens.css'
import './LoginCard.css'

function LoginCard({ onSubmit, notice }) {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('loading')
    setErrorMessage('')
    try {
      await onSubmit(password)
      // A senha sai do state assim que vira token: daqui pra frente quem
      // autentica é o token, e não há motivo para ela continuar em memória.
      setPassword('')
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err.message)
    }
  }

  return (
    <div className="admin login-card__wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-card__title">Painel do convite</h1>

        {notice && <p className="login-card__notice">{notice}</p>}

        <label className="login-card__label" htmlFor="admin-password">
          Senha
        </label>
        <input
          id="admin-password"
          type="password"
          className="login-card__input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />

        {status === 'error' && <p className="login-card__error">{errorMessage}</p>}

        <button type="submit" className="login-card__submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

export default LoginCard
