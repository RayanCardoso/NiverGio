import './adminTokens.css'
import './AdminShell.css'

// SVG inline em vez de emoji: emoji na navegação muda de desenho a cada sistema
// e é o que mais entrega "template genérico" num painel.
const ICONS = {
  overview: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z',
  guests: 'M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z',
  sends: 'M3 20.5 21 12 3 3.5 3 10l12 2-12 2v6.5Z',
}

function AdminShell({
  section,
  sections,
  title,
  onSection,
  onRefresh,
  refreshing,
  onLogout,
  children,
}) {
  return (
    <div className="admin admin-shell">
      <nav className="admin-shell__nav" aria-label="Seções do painel">
        <p className="admin-shell__brand">Painel do convite</p>

        <ul className="admin-shell__list">
          {sections.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`admin-shell__link${section === item.id ? ' is-active' : ''}`}
                onClick={() => onSection(item.id)}
                aria-current={section === item.id ? 'page' : undefined}
              >
                <svg className="admin-shell__icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={ICONS[item.id]} fill="currentColor" />
                </svg>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* /confirmacao e não /, senão o organizador cai no vídeo de abertura. */}
        <a className="admin-shell__see-invite" href="/confirmacao/">
          Ver o convite
        </a>
      </nav>

      <header className="admin-shell__top">
        <h1 className="admin-shell__title">{title}</h1>
        <div className="admin-shell__actions">
          <button
            type="button"
            className="admin-shell__action"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Atualizando…' : 'Atualizar'}
          </button>
          <button
            type="button"
            className="admin-shell__action admin-shell__action--ghost"
            onClick={onLogout}
          >
            Sair
          </button>
        </div>
      </header>

      <main className="admin-shell__content">{children}</main>
    </div>
  )
}

export default AdminShell
