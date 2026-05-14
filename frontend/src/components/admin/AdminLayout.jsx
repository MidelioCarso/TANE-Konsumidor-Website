import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Newspaper,
  LogOut,
  ShieldCheck,
  Building2,
  History,
  Users,
  ClipboardList,
  AlertCircle,
  PlusCircle,
  List,
  BookOpen,
  FileText,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import '../../admin.css'

function SidebarNavItem({ to, label, Icon, end, onNavigate, badge }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `adm-nav-item${isActive ? ' active' : ''}`
      }
    >
      <Icon size={17} strokeWidth={2} />
      <span>{label}</span>
      {badge > 0 ? <span className="adm-nav-badge">{badge > 99 ? '99+' : badge}</span> : null}
    </NavLink>
  )
}

function SidebarSubItem({
  to,
  label,
  Icon,
  end,
  onNavigate,
  badge,
  activeQueryKey,
  activeQueryValue,
  requireNoQueryKey,
}) {
  const location = useLocation()
  const [toPath] = String(to).split('?')
  const currentParams = new URLSearchParams(location.search)
  const pathActive = end ? location.pathname === toPath : location.pathname.startsWith(toPath)

  let isActive = pathActive
  if (requireNoQueryKey) {
    isActive = isActive && !currentParams.get(requireNoQueryKey)
  }
  if (activeQueryKey) {
    isActive =
      isActive
      && (currentParams.get(activeQueryKey) || '').toLowerCase()
        === String(activeQueryValue || '').toLowerCase()
  }

  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`adm-nav-sub-item${isActive ? ' active' : ''}`}
    >
      <Icon size={15} strokeWidth={2} />
      <span>{label}</span>
      {badge > 0 ? <span className="adm-nav-badge">{badge > 99 ? '99+' : badge}</span> : null}
    </Link>
  )
}

function NavGroup({ label, Icon, children, pathPrefixes = [] }) {
  const location = useLocation()
  const isAnyActive = pathPrefixes.some((prefix) =>
    location.pathname.startsWith(prefix)
  )
  const [open, setOpen] = useState(isAnyActive)

  return (
    <div className="adm-nav-group">
      <button
        className={`adm-nav-group-header${open ? ' open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="adm-nav-group-header-left">
          <Icon size={17} strokeWidth={2} />
          {label}
        </span>
        <ChevronDown size={14} className="chevron" />
      </button>
      {open && <div className="adm-nav-group-items">{children}</div>}
    </div>
  )
}

export default function AdminLayout() {
  const { user, logout } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [pendingKeixaCount, setPendingKeixaCount] = useState(0)
  const [pendingNewsCount, setPendingNewsCount] = useState(0)
  const [pendingPublicationCount, setPendingPublicationCount] = useState(0)

  const capabilities = user?.capabilities || {}
  const isSuperadmin = Boolean(user?.is_superuser || capabilities.is_superadmin)
  const canManageContent = isSuperadmin || Boolean(capabilities.can_manage_content)
  const canReviewPublish = isSuperadmin || Boolean(capabilities.can_review_publish)
  const canManageKeixas = isSuperadmin || Boolean(capabilities.can_manage_keixas)
  const canManageUsers = isSuperadmin || Boolean(capabilities.can_manage_users)
  const canManageSiteContent = isSuperadmin || Boolean(capabilities.can_manage_site_content)
  const role = capabilities.role || (isSuperadmin ? 'super_admin' : 'none')

  const roleLabelMap = {
    super_admin: 'Super Admin',
    officer_moderator: 'Officer / Moderator',
    staff: 'Staff',
    none: 'Admin',
  }

  const closeMobileNav = () => setMobileNavOpen(false)
  const toggleMobileNav = () => setMobileNavOpen((v) => !v)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileNavOpen) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileNavOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileNavOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    if (!isMobile) return undefined

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [mobileNavOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const syncViewport = () => {
      const mobile = window.innerWidth <= 768
      setIsMobileViewport(mobile)
      if (!mobile) {
        setMobileNavOpen(false)
      }
    }

    syncViewport()

    const onResize = () => {
      syncViewport()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!canManageKeixas) {
      setPendingKeixaCount(0)
      return undefined
    }

    let isMounted = true

    const loadKeixaStats = () => {
      fetch('/api/admin/complaints/stats/', { credentials: 'same-origin' })
        .then((r) => r.json())
        .then((data) => {
          if (!isMounted) return
          setPendingKeixaCount(Number(data.pending || 0))
        })
        .catch(() => {
          if (!isMounted) return
          setPendingKeixaCount(0)
        })
    }

    loadKeixaStats()
    const timer = setInterval(loadKeixaStats, 45000)

    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [location.pathname, canManageKeixas])

  useEffect(() => {
    if (!canReviewPublish) {
      setPendingNewsCount(0)
      setPendingPublicationCount(0)
      return undefined
    }

    let isMounted = true

    const loadReviewStats = () => {
      fetch('/api/admin/stats/', { credentials: 'same-origin' })
        .then((r) => r.json())
        .then((data) => {
          if (!isMounted) return
          setPendingNewsCount(Number(data.pending_news_reviews || 0))
          setPendingPublicationCount(Number(data.pending_publication_reviews || 0))
        })
        .catch(() => {
          if (!isMounted) return
          setPendingNewsCount(0)
          setPendingPublicationCount(0)
        })
    }

    loadReviewStats()
    const timer = setInterval(loadReviewStats, 60000)

    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [location.pathname, canReviewPublish])

  const handleLogout = async () => {
    await logout()
    navigate('/admin-panel/login', { replace: true })
  }

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'SA'

  return (
    <div className={`adm-shell${mobileNavOpen ? ' adm-shell--nav-open' : ''}`}>
      <button
        type="button"
        className="adm-mobile-menu-btn"
        onClick={toggleMobileNav}
        aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileNavOpen}
      >
        {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <button
        type="button"
        className={`adm-mobile-overlay${mobileNavOpen ? ' open' : ''}`}
        onClick={closeMobileNav}
        aria-label="Close menu overlay"
      />

      {/* ── Sidebar ── */}
      <aside
        className={`adm-sidebar${mobileNavOpen ? ' adm-sidebar--open' : ''}`}
        aria-hidden={isMobileViewport && !mobileNavOpen}
      >
        <div className="adm-sidebar-brand">
          <Link
            to="/admin-panel"
            className="adm-sidebar-brand-link"
            onClick={closeMobileNav}
          >
            <img src="/logo.png" alt="TANE" />
            <div className="adm-sidebar-brand-text">
              <span className="adm-sidebar-brand-title">TANE Admin</span>
              <span className="adm-sidebar-brand-sub">Control Panel</span>
            </div>
          </Link>
          <button
            type="button"
            className="adm-sidebar-close"
            onClick={closeMobileNav}
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="adm-sidebar-nav">
          {/* ── Dashboard ── */}
          <div className="adm-nav-section-label">Main</div>
          <SidebarNavItem
            to="/admin-panel"
            label="Dashboard"
            Icon={LayoutDashboard}
            end={true}
            onNavigate={closeMobileNav}
          />

          {canManageContent && (
            <>
              <div className="adm-nav-section-label" style={{ marginTop: 16 }}>
                Notísias
              </div>
              <NavGroup
                label="Notísias"
                Icon={Newspaper}
                pathPrefixes={['/admin-panel/noticias']}
              >
                <SidebarSubItem
                  to="/admin-panel/noticias"
                  label="Lista Notísias"
                  Icon={List}
                  end={true}
                  onNavigate={closeMobileNav}
                  requireNoQueryKey="status"
                  badge={canReviewPublish ? pendingNewsCount : 0}
                />
                <SidebarSubItem
                  to="/admin-panel/noticias/new"
                  label={canReviewPublish ? 'Kria Notísia Foun' : 'Submete Notísia'}
                  Icon={PlusCircle}
                  end={true}
                  onNavigate={closeMobileNav}
                />
              </NavGroup>
            </>
          )}

          {canManageSiteContent && (
            <>
              <div className="adm-nav-section-label" style={{ marginTop: 16 }}>
                Konteudu Website
              </div>
              <NavGroup
                label="Kona-ba TANE"
                Icon={BookOpen}
                pathPrefixes={[
                  '/admin-panel/perfil',
                  '/admin-panel/historia',
                  '/admin-panel/stakeholders',
                  '/admin-panel/estrategia',
                ]}
              >
                <SidebarSubItem
                  to="/admin-panel/perfil"
                  label="Perfil Organizasaun"
                  Icon={Building2}
                  onNavigate={closeMobileNav}
                />
                <SidebarSubItem
                  to="/admin-panel/historia"
                  label="Istória TANE"
                  Icon={History}
                  onNavigate={closeMobileNav}
                />
                <SidebarSubItem
                  to="/admin-panel/stakeholders"
                  label="Stakeholders"
                  Icon={Users}
                  onNavigate={closeMobileNav}
                />
                <SidebarSubItem
                  to="/admin-panel/estrategia"
                  label="Estratejia"
                  Icon={ClipboardList}
                  onNavigate={closeMobileNav}
                />
              </NavGroup>
            </>
          )}

          {canManageContent && (
            <>
              <div className="adm-nav-section-label" style={{ marginTop: 16 }}>
                Publikasaun
              </div>
              <NavGroup
                label="Publikasaun"
                Icon={FileText}
                pathPrefixes={['/admin-panel/publications']}
              >
                <SidebarSubItem
                  to="/admin-panel/publications"
                  label="Lista Publikasaun"
                  Icon={List}
                  end={true}
                  onNavigate={closeMobileNav}
                  requireNoQueryKey="status"
                  badge={canReviewPublish ? pendingPublicationCount : 0}
                />
                <SidebarSubItem
                  to="/admin-panel/publications/new"
                  label={canReviewPublish ? 'Kria Publikasaun' : 'Submete Publikasaun'}
                  Icon={PlusCircle}
                  end={true}
                  onNavigate={closeMobileNav}
                />
              </NavGroup>
            </>
          )}

          {canManageKeixas && (
            <>
              <div className="adm-nav-section-label" style={{ marginTop: 16 }}>
                Atendimentu
              </div>
              <SidebarNavItem
                to="/admin-panel/keixas"
                label="Jestaun Keixas"
                Icon={AlertCircle}
                onNavigate={closeMobileNav}
                badge={pendingKeixaCount}
              />
            </>
          )}

          {canManageUsers && (
            <>
              <div className="adm-nav-section-label" style={{ marginTop: 16 }}>
                Utilizador & Roles
              </div>
              <NavGroup
                label="Admin Users"
                Icon={Users}
                pathPrefixes={['/admin-panel/admin-users']}
              >
                <SidebarSubItem
                  to="/admin-panel/admin-users"
                  label="Jere Utilizadores"
                  Icon={List}
                  end={true}
                  onNavigate={closeMobileNav}
                />
              </NavGroup>
            </>
          )}
        </nav>

        <div className="adm-sidebar-footer">
          <div className="adm-sidebar-user">
            <div className="adm-user-avatar">{initials}</div>
            <div className="adm-user-info">
              <div className="adm-user-name">{user?.username || 'Admin'}</div>
              <div className="adm-user-role">
                <ShieldCheck size={10} style={{ marginRight: 3 }} />
                {roleLabelMap[role] || 'Admin'}
              </div>
            </div>
          </div>
          <button
            className="adm-logout-btn"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut size={15} strokeWidth={2} />
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main body ── */}
      <div className="adm-body">
        <Outlet />
      </div>

      {showLogoutConfirm && (
        <div className="adm-modal-overlay">
          <div className="adm-modal" style={{ maxWidth: 420 }}>
            <h3>Ita boot Hakarak Log out?</h3>
            <p>Sei remata sessaun admin agora.</p>
            <div className="adm-modal-actions">
              <button
                className="adm-btn adm-btn-secondary"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Kansela
              </button>
              <button
                className="adm-btn adm-btn-danger"
                style={{
                  background: '#d93025',
                  color: '#fff',
                  padding: '10px 20px',
                }}
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
