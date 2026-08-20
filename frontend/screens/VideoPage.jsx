import { useRef, useState } from 'react'
import Sparkles from '../components/Sparkles.jsx'
import './VideoPage.css'

function VideoPage({ onFinished }) {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [videoError, setVideoError] = useState(false)

  const handleActivate = () => {
    if (playing) return
    const video = videoRef.current
    if (!video) return

    video
      .play()
      .then(() => setPlaying(true))
      .catch(() => setVideoError(true))
  }

  return (
    <div className="video-page" onClick={handleActivate}>
      {/* Só aparecem no desktop, onde sobra fundo em volta da moldura. */}
      <Sparkles />

      <div className="video-page__frame">
        <video
          ref={videoRef}
          className="video-page__video"
          src="/video.mp4"
          playsInline
          onEnded={onFinished}
          onError={() => setVideoError(true)}
        />

        {!playing && !videoError && (
          <div className="video-page__hint">
            <span className="video-page__hint-text">Abrir convite</span>
          </div>
        )}

        {videoError && (
          <div className="video-page__hint video-page__hint--error">
            <span className="video-page__hint-text">
              Adicione o arquivo <code>video.mp4</code> na pasta{' '}
              <code>public/</code> do projeto.
            </span>
            <button
              type="button"
              className="video-page__skip"
              onClick={(e) => {
                e.stopPropagation()
                onFinished()
              }}
            >
              Continuar mesmo assim →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoPage
