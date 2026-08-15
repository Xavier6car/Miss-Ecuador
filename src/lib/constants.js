// Definición de las 4 fases de Miss Universo Ecuador.
// `pickCount` = cuántas candidatas debe elegir el usuario en esa fase.
// `podium` = true en la fase donde en vez de una lista se predice el podio exacto.
export const PHASES = [
  {
    key: 'phase1',
    order: 1,
    label: 'Top 15',
    shortLabel: 'Fase 1',
    description: 'Elige 15 de las 26 candidatas que crees pasarán al corte.',
    pickCount: 15,
    podium: false,
    pointsPerHit: 5,
  },
  {
    key: 'phase2',
    order: 2,
    label: 'Top 10',
    shortLabel: 'Fase 2',
    description: 'De las 15 que avanzaron, elige 10.',
    pickCount: 10,
    podium: false,
    pointsPerHit: 10,
  },
  {
    key: 'phase3',
    order: 3,
    label: 'Top 5',
    shortLabel: 'Fase 3',
    description: 'De las 10 que avanzaron, elige 5.',
    pickCount: 5,
    podium: false,
    pointsPerHit: 20,
    perfectBonus: 25,
  },
  {
    key: 'phase4',
    order: 4,
    label: 'Podio Final',
    shortLabel: 'Fase 4',
    description: 'Predice Ganadora, 1ra Finalista y 2da Finalista en orden exacto, entre las 5 finalistas.',
    pickCount: 3,
    podium: true,
    points: { winner: 50, first: 30, second: 20 },
  },
]

export const PHASE_STATUS = {
  ABIERTA: 'abierta',
  CERRADA: 'cerrada',
  PUBLICADA: 'resultados_publicados',
}

export const ROLES = {
  ADMIN: 'admin',
  COLABORADOR: 'colaborador',
  USUARIO: 'usuario',
}

// Reacciones disponibles en la sección "Candidatas". `key` es lo que se
// guarda en Firestore (candidates/{id}/reactions/{uid}.emojiKey); `emoji`
// es solo para mostrar, así se puede cambiar el glifo sin migrar datos.
export const REACTIONS = [
  { key: 'heart', emoji: '❤️', label: 'Me encanta' },
  { key: 'fire', emoji: '🔥', label: 'Está en fuego' },
  { key: 'clap', emoji: '👏', label: 'Aplausos' },
  { key: 'love', emoji: '😍', label: 'Enamorado/a' },
]

// `active`: compite normalmente.
// `eliminated`: no avanzó en un corte normal de fase (lo pone el sistema al publicar resultados).
// `anulada`: se descalificó/retiró a media competencia (acción manual del admin, fuera del corte
// normal) — ver `annulCandidate` en lib/data.js.
export const CANDIDATE_STATUS = {
  ACTIVE: 'active',
  ELIMINATED: 'eliminated',
  ANULADA: 'anulada',
}

export function getPhase(phaseKey) {
  return PHASES.find((p) => p.key === phaseKey)
}

export function phaseByOrder(order) {
  return PHASES.find((p) => p.order === order)
}

export function previousPhase(phaseKey) {
  const phase = getPhase(phaseKey)
  if (!phase || phase.order === 1) return null
  return phaseByOrder(phase.order - 1)
}

export function nextPhase(phaseKey) {
  const phase = getPhase(phaseKey)
  if (!phase) return null
  return phaseByOrder(phase.order + 1)
}
