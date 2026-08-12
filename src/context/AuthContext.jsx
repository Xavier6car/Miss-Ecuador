import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase'
import { ROLES } from '../lib/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }
      await ensureUserDoc(user)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!firebaseUser) return
    const ref = doc(db, 'users', firebaseUser.uid)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setProfile({ id: snap.id, ...snap.data() })
      setLoading(false)
    })
    return unsub
  }, [firebaseUser])

  async function ensureUserDoc(user) {
    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        name: user.displayName || user.email?.split('@')[0] || 'Usuario',
        email: user.email,
        role: ROLES.USUARIO,
        totalPoints: 0,
        pointsByPhase: {},
        createdAt: serverTimestamp(),
      })
    }
  }

  async function loginWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider)
    await ensureUserDoc(cred.user)
  }

  async function logout() {
    await signOut(auth)
  }

  const value = {
    firebaseUser,
    profile,
    loading,
    isAdmin: profile?.role === ROLES.ADMIN,
    isColaborador: profile?.role === ROLES.COLABORADOR,
    canManageCandidates: profile?.role === ROLES.ADMIN || profile?.role === ROLES.COLABORADOR,
    loginWithGoogle,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
