import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function FullPageSpinner() {
  return <div className="spinner-wrap">Cargando...</div>
}

export function RequireAuth() {
  const { firebaseUser, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!firebaseUser) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RequireRole({ roles }) {
  const { profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!profile || !roles.includes(profile.role)) return <Navigate to="/" replace />
  return <Outlet />
}
