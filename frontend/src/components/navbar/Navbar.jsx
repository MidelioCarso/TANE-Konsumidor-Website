import { useEffect, useRef, useState } from 'react'
import { BookOpen, LayoutList, Landmark, Menu, X } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { getAssetPath } from '../../utils/assetPaths'

const ABOUT_LINKS = [
  { to: '/about/perfil',   Icon: Landmark,   label: 'Perfil TANE' },
  { to: '/about/historia', Icon: BookOpen,    label: 'Istória TANE' },
  { to: '/about/planu',    Icon: LayoutList,  label: 'Planu Estratejiku' },
]

function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [canHover, setCanHover] = useState(false)
  const closeTimer = useRef(null)
  const navRootRef = useRef(null)
  const location = useLocation()
  const isAboutActive = location.pathname.startsWith('/about')

  useEffect(() => {
    setMobileMenuOpen(false)
    setDropdownOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const sync = () => setCanHover(mq.matches)
    sync()

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', sync)
      return () => mq.removeEventListener('change', sync)
    }

    mq.addListener(sync)
    return () => mq.removeListener(sync)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const onPointerDown = (event) => {
      if (!navRootRef.current) return
      if (!navRootRef.current.contains(event.target)) {
        setDropdownOpen(false)
        setMobileMenuOpen(false)
      }
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false)
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown, { passive: true })
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
    if (!isMobile) return undefined

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [mobileMenuOpen])

  const openDropdown = () => {
    clearTimeout(closeTimer.current)
    setDropdownOpen(true)
  }

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setDropdownOpen(false), 150)
  }

  const closeNow = () => {
    clearTimeout(closeTimer.current)
    setDropdownOpen(false)
  }

  const closeAll = () => {
    closeNow()
    setMobileMenuOpen(false)
  }

  const toggleDropdown = () => {
    clearTimeout(closeTimer.current)
    setDropdownOpen((prev) => !prev)
  }

  return (
    <header className={`navbar${mobileMenuOpen ? ' navbar-mobile-open' : ''}`} ref={navRootRef}>
      <div className="container navbar-inner">
        <NavLink to="/home" className="brand">
          <img src={getAssetPath('logo_nav_2.png')} alt="TANE Konsumidor" className="brand-logo" />
        </NavLink>

        <button
          className="nav-mobile-toggle"
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={`nav-links${mobileMenuOpen ? ' nav-links--open' : ''}`}>
          <NavLink to="/home" onClick={closeAll}>Inisiu</NavLink>

          {/* ── Kona-ba TANE dropdown ── */}
          <div
            className="nav-dropdown"
            onMouseEnter={canHover ? openDropdown : undefined}
            onMouseLeave={canHover ? scheduleClose : undefined}
          >
            <button
              className={`nav-dropdown-trigger${
                isAboutActive ? ' dropdown-active' : ''
              }`}
              onClick={toggleDropdown}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              Kona-ba TANE
              <span className={`dropdown-arrow${dropdownOpen ? ' dropdown-arrow--open' : ''}`}>
                ▾
              </span>
            </button>

            {dropdownOpen && (
              <div
                className="nav-dropdown-menu"
                onMouseEnter={canHover ? openDropdown : undefined}
                onMouseLeave={canHover ? scheduleClose : undefined}
              >
                {ABOUT_LINKS.map((link) => (
                  <NavLink key={link.to} to={link.to} onClick={closeAll}>
                    <link.Icon size={15} strokeWidth={2} className="dropdown-menu-icon" />
                    {link.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <NavLink to="/work" onClick={closeAll}>Notísias</NavLink>
          <NavLink to="/publications" onClick={closeAll}>Publikasaun</NavLink>
          <NavLink to="/contact" onClick={closeAll}>Submete Keixa</NavLink>
        </nav>
      </div>
    </header>
  )
}

export default Navbar