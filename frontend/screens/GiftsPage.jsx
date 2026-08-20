import { useState } from 'react'
import Sparkles from '../components/Sparkles.jsx'
import {
  SneakerIcon,
  ShirtIcon,
  ShortsIcon,
  RingsIcon,
  PerfumeIcon,
  DressIcon,
  PixIcon,
} from '../components/GiftIcons.jsx'
import { GIFT_INTRO, GIFT_SUGGESTIONS, PIX_KEY } from '../config.js'
import './GiftsPage.css'

const ICONS = {
  sneaker: SneakerIcon,
  shirt: ShirtIcon,
  shorts: ShortsIcon,
  rings: RingsIcon,
  perfume: PerfumeIcon,
  dress: DressIcon,
}

function GiftsPage({ onBack }) {
  const [copied, setCopied] = useState(false)

  const handleCopyPix = () => {
    navigator.clipboard
      .writeText(PIX_KEY)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  return (
    <div className="gifts-page">
      <Sparkles />

      <div className="gifts-page__content">
        <button type="button" className="gifts-page__back" onClick={onBack}>
          ← Voltar
        </button>

        <h1 className="gifts-page__title">Sugestões de presentes</h1>

        <p className="gifts-page__intro">{GIFT_INTRO}</p>

        <div className="gifts-page__grid">
          {GIFT_SUGGESTIONS.map((item) => {
            const Icon = ICONS[item.icon]
            return (
              <div className="gifts-page__item" key={item.label}>
                <Icon className="gifts-page__item-icon" />
                <span className="gifts-page__item-label">{item.label}</span>
                {item.detail && (
                  <span className="gifts-page__item-detail">{item.detail}</span>
                )}
              </div>
            )
          })}
        </div>

        <button type="button" className="gifts-page__pix" onClick={handleCopyPix}>
          <PixIcon className="gifts-page__pix-icon" />
          <span className="gifts-page__pix-label">PIX</span>
          <span className="gifts-page__pix-key">{PIX_KEY}</span>
          <span className="gifts-page__pix-copy">
            {copied ? 'copiado! ✓' : 'toque para copiar'}
          </span>
        </button>
      </div>
    </div>
  )
}

export default GiftsPage
