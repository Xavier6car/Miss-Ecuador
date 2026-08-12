import { useEffect, useState } from 'react'
import { listenRanking } from '../lib/data'
import { useAuth } from '../context/AuthContext'

/** Devuelve la posición del usuario actual en el ranking y el total de participantes. */
export function useMyRank() {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])

  useEffect(() => listenRanking(setUsers), [])

  const rank = profile ? users.findIndex((u) => u.id === profile.id) + 1 : 0

  return {
    rank: rank > 0 ? rank : null,
    total: users.length,
    totalPoints: profile?.totalPoints ?? 0,
  }
}
