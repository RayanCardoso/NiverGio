'use client'

import { useEffect, useState } from 'react'
import InfoPage from '../../../screens/InfoPage.jsx'
import GiftsPage from '../../../screens/GiftsPage.jsx'
import ConfirmPresencaPage from '../../../screens/ConfirmPresencaPage.jsx'

// Tudo que vem depois do vídeo mora nesta rota. Dentro dela a navegação continua
// sendo um `stage` só, porque presentes e confirmação são telas curtas, sempre
// abertas a partir daqui e sem link direto pra elas.
function ConfirmacaoPage() {
  const [stage, setStage] = useState('info') // 'info' | 'presentes' | 'confirmar'
  const [code, setCode] = useState('')

  // window.location e não useSearchParams: com output:'export' o useSearchParams
  // obriga a envolver a página num <Suspense> só pra o build passar, sem ganho
  // nenhum para ler uma query string.
  useEffect(() => {
    setCode(new URLSearchParams(window.location.search).get('c') || '')
  }, [])

  if (stage === 'presentes') {
    return <GiftsPage onBack={() => setStage('info')} />
  }
  if (stage === 'confirmar') {
    return <ConfirmPresencaPage code={code} onBack={() => setStage('info')} />
  }
  return (
    <InfoPage
      onOpenGifts={() => setStage('presentes')}
      onOpenConfirm={() => setStage('confirmar')}
    />
  )
}

export default ConfirmacaoPage
