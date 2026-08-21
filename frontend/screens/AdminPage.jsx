import { useCallback, useEffect, useState } from 'react'
import { adminLogin, adminLogout, fetchGroups, getToken, SessionExpiredError } from '../api.js'
import AdminShell from './admin/AdminShell.jsx'
import LoginCard from './admin/LoginCard.jsx'
import OverviewSection from './admin/OverviewSection.jsx'
import './AdminPage.css'

// O menu cresce junto com as seções: item que não leva a lugar nenhum é o que
// faz uma sidebar parecer enfeite.
const SECTIONS = [{ id: 'overview', label: 'Visão geral' }]

const TITLES = {
  overview: 'Visão geral',
}

function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [notice, setNotice] = useState('')
  const [groups, setGroups] = useState([])
  const [section, setSection] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

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
    await adminLogout()
    setAuthed(false)
    setGroups([])
    setNotice('')
  }

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
      {section === 'overview' && <OverviewSection groups={groups} onFilter={() => setSection('overview')} />}
    </AdminShell>
  )
}

export default AdminPage
