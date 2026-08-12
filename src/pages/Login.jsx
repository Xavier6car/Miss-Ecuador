import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { firebaseUser, loginWithGoogle } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  if (firebaseUser) {
    return <Navigate to={location.state?.from || '/'} replace />
  }

  async function handleGoogle() {
    setError('')
    setBusy(true)
    try {
      await loginWithGoogle()
      navigate('/')
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <div className="center" style={{ marginBottom: 20 }}>
          <div className="brand-badge" style={{ margin: '0 auto 10px' }}>
            ME
          </div>
          <h1 style={{ fontSize: 22 }}>Polla Miss Ecuador</h1>
          <p className="text-dim" style={{ margin: 0 }}>Ingresa con tu cuenta de Google</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} onClick={handleGoogle}>
          Continuar con Google
        </button>
      </div>
    </div>
  )
}

function mapAuthError(err) {
  const code = err?.code || ''
  const map = {
    'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de terminar.',
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase Authentication.',
  }
  return map[code] || 'Ocurrió un error. Intenta de nuevo.'
}
