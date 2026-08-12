import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { firebaseUser, login, register, loginWithGoogle } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  if (firebaseUser) {
    return <Navigate to={location.state?.from || '/'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(name, email, password)
      }
      navigate('/')
    } catch (err) {
      setError(mapAuthError(err))
    } finally {
      setBusy(false)
    }
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
          <p className="text-dim" style={{ margin: 0 }}>
            {mode === 'login' ? 'Ingresa a tu cuenta' : 'Crea tu cuenta'}
          </p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-row">
              <label>Nombre</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="form-row">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy} type="submit">
            {mode === 'login' ? 'Ingresar' : 'Registrarme'}
          </button>
        </form>

        <button className="btn" style={{ width: '100%', marginTop: 10 }} disabled={busy} onClick={handleGoogle}>
          Continuar con Google
        </button>

        <p className="center text-dim" style={{ marginTop: 16, fontSize: 13 }}>
          {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login') }}>
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </a>
        </p>
      </div>
    </div>
  )
}

function mapAuthError(err) {
  const code = err?.code || ''
  const map = {
    'auth/invalid-credential': 'Email o contraseña incorrectos.',
    'auth/wrong-password': 'Email o contraseña incorrectos.',
    'auth/user-not-found': 'No existe una cuenta con ese email.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de terminar.',
  }
  return map[code] || 'Ocurrió un error. Intenta de nuevo.'
}
