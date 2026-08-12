import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useActivePhase } from '../hooks/useActivePhase'

export default function BottomNav() {
  const { profile } = useAuth()
  const { activePhaseKey } = useActivePhase()

  if (!profile) return null

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}>
        <span className="bn-icon">🏠</span>
        Inicio
      </NavLink>
      <NavLink to="/candidatas" className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}>
        <span className="bn-icon">👥</span>
        Candidatas
      </NavLink>
      <NavLink
        to={`/prediccion/${activePhaseKey}`}
        className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}
      >
        <span className="bn-icon">🎯</span>
        Predicción
      </NavLink>
      <NavLink to="/ranking" className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}>
        <span className="bn-icon">🏆</span>
        Ranking
      </NavLink>
    </nav>
  )
}
