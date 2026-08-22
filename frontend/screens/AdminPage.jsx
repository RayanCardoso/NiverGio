import { useCallback, useEffect, useState } from 'react'
import { adminLogin, adminLogout, fetchGroups, getToken, SessionExpiredError } from '../api.js'
import AdminShell from './admin/AdminShell.jsx'
import GuestsSection from './admin/GuestsSection.jsx'
import LoginCard from './admin/LoginCard.jsx'
import OverviewSection from './admin/OverviewSection.jsx'
import SendsSection from './admin/SendsSection.jsx'
import './AdminPage.css'

// O menu cresce junto com as seções: item que não leva a lugar nenhum é o que
// faz uma sidebar parecer enfeite.
const SECTIONS = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'guests', label: 'Convidados' },
  { id: 'sends', label: 'Envios' },
]

const TITLES = {
  overview: 'Visão geral',
  guests: 'Convidados',
  sends: 'Envios',
}

function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [notice, setNotice] = useState('')
  const [groups, setGroups] = useState([])
  const [section, setSection] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [filter, setFilter] = useState('todos')

  const load = useCallback(async () => {
    setRefreshing(true)
    setErrorMessage('')
    try {
      const data = await fetchGroups()
      setGroups(data.groups)
      setAuthed(true)
      setNotice('')
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        setAuthed(false)
        setNotice(err.message)
      } else {
        setErrorMessage(err.message)
      }
    } finally {
      setRefreshing(false)
    }
  }, [])

  // O token vive no sessionStorage, então um F5 não deve pedir a senha de novo —
  // mas quem decide se ele ainda vale é o servidor, não o navegador.
  useEffect(() => {
    if (getToken()) load()
  }, [load])

  const handleLogin = async (password) => {
    await adminLogin({ password })
    await load()
  }

  const handleLogout = async () => {
    // O token já sai do navegador dentro do adminLogout (finally). Aqui o
    // finally é o que garante que a TELA volte ao login mesmo se a chamada
    // falhar: sem ele, um 401 no próprio logout deixaria o dashboard aberto,
    // com nomes e telefones, para quem achou que tinha saído.
    try {
      await adminLogout()
    } finally {
      setAuthed(false)
      setGroups([])
      setNotice('')
    }
  }

  // Ponto único: qualquer escrita que receber 401 (o token já foi apagado
  // pelo api.js) cai aqui em vez de virar texto vermelho numa seção — o
  // organizador não fica num painel morto, ele volta para o login.
  const handleSessionExpired = useCallback((message) => {
    setAuthed(false)
    setNotice(message || 'Sessão expirada. Entre de novo.')
  }, [])

  if (!authed) {
    return <LoginCard onSubmit={handleLogin} notice={notice} />
  }

  return (
    <AdminShell
      section={section}
      sections={SECTIONS}
      title={TITLES[section]}
      onSection={setSection}
      onRefresh={load}
      refreshing={refreshing}
      onLogout={handleLogout}
    >
      {errorMessage && <p className="admin-page__error">{errorMessage}</p>}

      {section === 'overview' && (
        <OverviewSection
          groups={groups}
          onFilter={(status) => {
            // O bloco "precisa da sua ação" leva para a lista já filtrada: é o
            // caminho que o organizador percorre toda vez que abre o painel.
            setFilter(status)
            setSection('guests')
          }}
        />
      )}

      {section === 'guests' && (
        <GuestsSection
          groups={groups}
          filter={filter}
          onFilterChange={setFilter}
          onReload={load}
          onSessionExpired={handleSessionExpired}
        />
      )}

      {section === 'sends' && (
        <SendsSection groups={groups} onReload={load} onSessionExpired={handleSessionExpired} />
      )}
    </AdminShell>
  )
}

export default AdminPage
