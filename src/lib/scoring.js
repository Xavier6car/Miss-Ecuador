import { getPhase } from './constants'

/**
 * Calcula los puntos que obtiene UNA predicción de un usuario para una fase
 * de tipo "lista" (fase 1, 2 o 3), comparando contra los resultados oficiales.
 *
 * @param {string} phaseKey
 * @param {string[]} picks - candidateIds elegidos por el usuario
 * @param {string[]} officialPicks - candidateIds que realmente avanzaron
 * @returns {{ points: number, hits: number, perfectBonus: number }}
 */
export function scoreListPhase(phaseKey, picks = [], officialPicks = []) {
  const phase = getPhase(phaseKey)
  if (!phase || phase.podium) return { points: 0, hits: 0, perfectBonus: 0 }

  const officialSet = new Set(officialPicks)
  const pickSet = new Set(picks)
  const hits = picks.filter((id) => officialSet.has(id)).length
  let points = hits * phase.pointsPerHit

  let perfectBonus = 0
  if (phase.perfectBonus) {
    const isPerfect =
      officialSet.size > 0 &&
      pickSet.size === officialSet.size &&
      [...officialSet].every((id) => pickSet.has(id))
    if (isPerfect) {
      perfectBonus = phase.perfectBonus
      points += perfectBonus
    }
  }

  return { points, hits, perfectBonus }
}

/**
 * Calcula los puntos del podio final (fase 4).
 * @param {{winner?: string, first?: string, second?: string}} podium - predicción del usuario
 * @param {{winner?: string, first?: string, second?: string}} officialPodium - resultado oficial
 */
export function scorePodiumPhase(podium = {}, officialPodium = {}) {
  const phase = getPhase('phase4')
  let points = 0
  const breakdown = { winner: false, first: false, second: false }

  if (podium.winner && officialPodium.winner && podium.winner === officialPodium.winner) {
    points += phase.points.winner
    breakdown.winner = true
  }
  if (podium.first && officialPodium.first && podium.first === officialPodium.first) {
    points += phase.points.first
    breakdown.first = true
  }
  if (podium.second && officialPodium.second && podium.second === officialPodium.second) {
    points += phase.points.second
    breakdown.second = true
  }

  return { points, breakdown }
}

/**
 * Calcula los puntos de una predicción para cualquier fase (lista o podio).
 */
export function scorePrediction(phaseKey, prediction, officialResult) {
  const phase = getPhase(phaseKey)
  if (!phase) return { points: 0 }
  if (phase.podium) {
    return scorePodiumPhase(prediction?.podium || {}, officialResult?.podium || {})
  }
  return scoreListPhase(phaseKey, prediction?.picks || [], officialResult?.officialPicks || [])
}

/** Suma los puntos de todas las fases guardadas en pointsByPhase. */
export function sumTotalPoints(pointsByPhase = {}) {
  return Object.values(pointsByPhase).reduce((sum, v) => sum + (Number(v) || 0), 0)
}
