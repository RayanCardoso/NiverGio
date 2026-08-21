import { useEffect, useState } from 'react'
import Countdown from '../components/Countdown.jsx'
import Sparkles from '../components/Sparkles.jsx'
import {
  EVENT_DATE,
  EVENT_DATE_LABEL,
  EVENT_TIME_LABEL,
  DRESS_CODE,
  LINKS,
} from '../config.js'
import './InfoPage.css'

const BUTTONS = [
  { key: 'confirmarPresenca', label: 'Confirmar presença', icon: '👑' },
  { key: 'comoChegar', label: 'Como chegar', icon: '🗺️' },
  { key: 'sugestoesPresente', label: 'Sugestões de presente', icon: '🎁' },
]

function InfoPage({ onOpenGifts, onOpenConfirm }) {
  const [scrolled, setScrolled] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleButtonClick = (key, label) => {
    if (key === 'sugestoesPresente') {
      onOpenGifts()
      return
    }
    if (key === 'confirmarPresenca') {
      onOpenConfirm()
      return
    }
    const url = LINKS[key]
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      alert(`"${label}" ainda não foi configurado. Em breve! ✨`)
    }
  }

  return (
    <div className="info-page">
      <Sparkles />

      <section className="info-page__hero">
        <h1 className="info-page__title">Vem celebrar comigo!</h1>

        <div className="info-page__image-frame">
          {!imgFailed ? (
            <img
              src="/imagem-principal.png"
              alt="Princesa tema Enrolados"
              className="info-page__image"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <TowerFallback />
          )}
        </div>

        <div className={`info-page__hint ${scrolled ? 'is-hidden' : ''}`}>
          <span>arraste para mais informações</span>
          <span className="info-page__hint-arrow">↓</span>
        </div>
      </section>

      <section className="info-page__details">
        <div className="info-page__card">
          <h2 className="info-page__date-label">{EVENT_DATE_LABEL}</h2>
          <p className="info-page__time-label">às {EVENT_TIME_LABEL}</p>
          <Countdown targetDate={EVENT_DATE} />
        </div>

        <div className="info-page__buttons">
          {BUTTONS.map((btn) => (
            <button
              key={btn.key}
              type="button"
              className="info-page__button"
              onClick={() => handleButtonClick(btn.key, btn.label)}
            >
              <span className="info-page__button-icon">{btn.icon}</span>
              {btn.label}
            </button>
          ))}
        </div>

        <footer className="info-page__dress-code">
          <p className="info-page__dress-code-label">Traje sugerido</p>
          <p className="info-page__dress-code-value">{DRESS_CODE}</p>
        </footer>
      </section>
    </div>
  )
}

function TowerFallback() {
  return (
    <svg
      viewBox="0 0 220 260"
      className="tower-fallback"
      role="img"
      aria-label="Ilustração de torre de princesa"
    >
      <defs>
        <linearGradient id="towerBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a63ad" />
          <stop offset="100%" stopColor="#5b3a7a" />
        </linearGradient>
      </defs>
      <polygon points="110,10 150,70 70,70" fill="#f0c454" />
      <rect x="80" y="70" width="60" height="150" fill="url(#towerBody)" rx="6" />
      <rect x="100" y="120" width="20" height="34" fill="#3b2a4a" rx="10" />
      <path
        d="M110 154 C 100 190, 95 220, 108 244"
        stroke="#f0c454"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="110" cy="40" r="6" fill="#fff8ef" />
    </svg>
  )
}

export default InfoPage
