'use client'

import { useRouter } from 'next/navigation'
import VideoPage from '../../screens/VideoPage.jsx'

// A "/" é só o vídeo de abertura. Quando ele termina a navegação troca de rota,
// em vez de trocar de estado como antes: assim recarregar a página cai direto
// no convite, sem obrigar o convidado a rever o vídeo inteiro.
function AberturaPage() {
  const router = useRouter()

  // replace, não push: o vídeo é uma abertura de uma vez só, então voltar pra
  // ele pelo botão do navegador só faria o convidado esperar de novo.
  return <VideoPage onFinished={() => router.replace('/confirmacao')} />
}

export default AberturaPage
