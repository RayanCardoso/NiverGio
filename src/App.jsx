import { useState } from 'react'
import VideoPage from './pages/VideoPage.jsx'
import InfoPage from './pages/InfoPage.jsx'
import GiftsPage from './pages/GiftsPage.jsx'

function App() {
  const [stage, setStage] = useState('video')

  if (stage === 'video') {
    return <VideoPage onFinished={() => setStage('info')} />
  }
  if (stage === 'presentes') {
    return <GiftsPage onBack={() => setStage('info')} />
  }
  return <InfoPage onOpenGifts={() => setStage('presentes')} />
}

export default App
