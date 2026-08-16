import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function MobileMenu() {
  const { profile, canManageCandidates, isAdmin, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  if (!profile) return null

  return (
    <div className="mobile-topbar">
      <span className="brand-title" style={{ fontSize: 17 }}>Miss Universo Ecuador</span>
      <div className="mobile-menu" ref={ref}>
        <button className="mobile-menu-trigger" onClick={() => setOpen((o) => !o)} aria-label="Menú">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        {open && (
          <div className="mobile-menu-dropdown">
            {(canManageCandidates || isAdmin) && (
              <NavLink to="/admin" className="mobile-menu-item" onClick={() => setOpen(false)}>
                Administración
              </NavLink>
            )}
            <NavLink to="/actividad" className="mobile-menu-item" onClick={() => setOpen(false)}>
              Actividad
            </NavLink>
            <NavLink to="/reglas" className="mobile-menu-item" onClick={() => setOpen(false)}>
              Reglas
            </NavLink>
            <button
              className="mobile-menu-item danger"
              onClick={() => {
                setOpen(false)
                logout()
              }}
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
