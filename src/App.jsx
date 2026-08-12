import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { RequireAuth, RequireRole, FullPageSpinner } from './components/Guards'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Candidates from './pages/Candidates'
import Predictions from './pages/Predictions'
import Ranking from './pages/Ranking'
import Rules from './pages/Rules'
import AdminHome from './pages/admin/AdminHome'

function AppLayout() {
  const { loading } = useAuth()
  if (loading) return <FullPageSpinner />
  return (
    <div className="app-shell">
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<RequireAuth />}>
          <Route path="/" element={<Navigate to="/candidatas" replace />} />
          <Route path="/candidatas" element={<Candidates />} />
          <Route path="/prediccion/:phaseKey" element={<Predictions />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/reglas" element={<Rules />} />

          <Route element={<RequireRole roles={['admin', 'colaborador']} />}>
            <Route path="/admin" element={<AdminHome />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <p className="footer-note">Miss Universo Ecuador · hecho con React + Firebase</p>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </HashRouter>
  )
}
