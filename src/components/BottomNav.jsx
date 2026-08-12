import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useActivePhase } from '../hooks/useActivePhase'

export default function BottomNav() {
  const { profile } = useAuth()
  const { activePhaseKey } = useActivePhase()

  if (!profile) return null

  const cls = ({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={cls}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5l9-7.5 9 7.5" />
          <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
        </svg>
        <span>Inicio</span>
      </NavLink>
      <NavLink to="/candidatas" className={cls}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>Candidatas</span>
      </NavLink>
      <NavLink to={`/prediccion/${activePhaseKey}`} className={cls}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" />
        </svg>
        <span>Predicción</span>
      </NavLink>
      <NavLink to="/ranking" className={cls}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h16" />
          <path d="M5.5 20L7 11l3 3 2-6 2 6 3-3 1.5 9" />
        </svg>
        <span>Ranking</span>
      </NavLink>
    </nav>
  )
}
