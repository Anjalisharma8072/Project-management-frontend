import { useCallback, useEffect, useState } from 'react'

const SECTIONS = [
  { id: 'overview', label: 'Overview', description: 'Counts and health at a glance' },
  { id: 'projects', label: 'Projects & team', description: 'Spaces and who is on them' },
  { id: 'tasks', label: 'Tasks', description: 'Work items and status' }
]

const MOBILE_MQ = '(max-width: 900px)'

const AppSidebar = ({ user, isAdmin, activeSection, onNavigate, onLogout }) => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const onChange = () => {
      setIsMobile(mq.matches)
      if (!mq.matches) setDrawerOpen(false)
    }
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  useEffect(() => {
    closeDrawer()
  }, [activeSection, closeDrawer])

  useEffect(() => {
    if (!drawerOpen || !isMobile) return
    const onKey = e => e.key === 'Escape' && closeDrawer()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen, isMobile, closeDrawer])

  const pick = id => {
    onNavigate(id)
    closeDrawer()
  }

  const toggleDrawer = () => setDrawerOpen(o => !o)

  return (
    <>
      {isMobile ? (
        <button
          type="button"
          className="sidebar-drawer-toggle"
          aria-expanded={drawerOpen}
          aria-controls="app-sidebar"
          onClick={toggleDrawer}
        >
          {drawerOpen ? 'Close' : 'Menu'}
        </button>
      ) : null}

      {isMobile && drawerOpen ? (
        <button type="button" className="sidebar-backdrop" aria-label="Close menu" onClick={closeDrawer} />
      ) : null}

      <aside
        id="app-sidebar"
        className={`sidebar ${isMobile && drawerOpen ? 'sidebar--open' : ''}`}
        aria-label="Workspace"
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-main">
            <span className="logo" aria-hidden>
              PM
            </span>
            <div>
              <p className="sidebar-app-name">Workspace</p>
              <p className="muted small">
                {user?.name} · {isAdmin ? 'Admin' : 'Member'}
              </p>
            </div>
          </div>
          {isMobile ? (
            <button type="button" className="sidebar-icon-btn" onClick={closeDrawer} aria-label="Close menu">
              ✕
            </button>
          ) : null}
        </div>

        <p className="sidebar-nav-label">Go to</p>
        <nav className="sidebar-nav" aria-label="Primary">
          {SECTIONS.map(s => {
            const active = activeSection === s.id
            return (
              <button
                key={s.id}
                type="button"
                className={`sidebar-nav-item ${active ? 'sidebar-nav-item--active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => pick(s.id)}
              >
                <span className="sidebar-nav-item-title">{s.label}</span>
                <span className="sidebar-nav-item-desc">{s.description}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-footer">
          <button type="button" className="btn ghost sidebar-logout" onClick={onLogout}>
            Log out
          </button>
        </div>
      </aside>
    </>
  )
}

export default AppSidebar
