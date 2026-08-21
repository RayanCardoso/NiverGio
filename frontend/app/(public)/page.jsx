'use client'

import { useRouter } from 'next/navigation'
import VideoPage from '../../screens/VideoPage.jsx'

// A "/" é só o vídeo de abertura. Quando ele termina a navegação troca de rota,
// em vez de trocar de estado como antes: assim recarregar a página cai direto
// no convite, sem obrigar o convidado a rever o vídeo inteiro.
function AberturaPage() {
  const router = useRouter()

  // O código da família chega em "?c=..." e precisa atravessar a troca de rota.
  // Sem isso, quem abriu o link certo cairia na tela de digitar código.
  const handleFinished = () => {
    const code = new URLSearchParams(window.location.search).get('c')
    router.replace(code ? `/confirmacao/?c=${encodeURIComponent(code)}` : '/confirmacao/')
  }

  // replace, não push: o vídeo é uma abertura de uma vez só, então voltar pra
  // ele pelo botão do navegador só faria o convidado esperar de novo.
  return <VideoPage onFinished={handleFinished} />
}

export default AberturaPage
