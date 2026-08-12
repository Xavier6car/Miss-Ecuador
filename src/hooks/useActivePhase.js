import { useEffect, useState } from 'react'
import { PHASES, PHASE_STATUS, getPhase } from '../lib/constants'
import { listenPhases } from '../lib/data'

/**
 * Devuelve la fase actualmente abierta (la primera que encuentre, en orden),
 * junto con el estado completo de todas las fases. Si ninguna está abierta,
 * `activePhaseKey` cae de vuelta a 'phase1' (para que los links de
 * navegación siempre tengan algún destino válido).
 */
export function useActivePhase() {
  const [phases, setPhases] = useState({})

  useEffect(() => listenPhases((key, data) => setPhases((prev) => ({ ...prev, [key]: data }))), [])

  const openPhase = PHASES.find((p) => phases[p.key]?.status === PHASE_STATUS.ABIERTA)
  const activePhaseKey = openPhase?.key || 'phase1'

  return {
    phases,
    activePhaseKey,
    activePhase: getPhase(activePhaseKey),
    isAnyPhaseOpen: Boolean(openPhase),
  }
}
