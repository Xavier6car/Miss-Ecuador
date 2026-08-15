import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  addDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { PHASES, PHASE_STATUS, CANDIDATE_STATUS, getPhase, previousPhase, nextPhase } from './constants'
import { scorePrediction, sumTotalPoints } from './scoring'

// ---------- Candidatas ----------

export function listenCandidates(callback) {
  const q = query(collection(db, 'candidates'), orderBy('number', 'asc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function saveCandidate(candidateId, data, editor) {
  const ref = candidateId ? doc(db, 'candidates', candidateId) : doc(collection(db, 'candidates'))
  await setDoc(
    ref,
    {
      ...data,
      lastEditedBy: editor?.uid || null,
      lastEditedByName: editor?.name || null,
      lastEditedAt: serverTimestamp(),
    },
    { merge: true },
  )
  return ref.id
}

export async function deleteCandidate(candidateId) {
  await deleteDoc(doc(db, 'candidates', candidateId))
}

/**
 * Anula/descalifica a una candidata a media competencia (fuera del corte
 * normal de una fase — para eso está "Publicar resultados"). Dos efectos:
 *
 * 1. Su estado pasa a 'anulada': deja de aparecer disponible para elegir en
 *    Predicciones ni en la selección de resultados oficiales del admin, en
 *    cualquier fase de ahí en adelante.
 * 2. Se la quita de las predicciones (picks o podio) ya guardadas por los
 *    usuarios en fases que TODAVÍA NO se publican — le libera ese cupo a
 *    cada usuario para que elija otra candidata. No cuenta como acierto ni
 *    como fallo. Las fases ya publicadas no se tocan (el puntaje ya
 *    otorgado con ella queda como está, no se recalcula retroactivamente).
 *
 * Devuelve cuántas predicciones se actualizaron.
 */
export async function annulCandidate(candidateId, editor) {
  await updateDoc(doc(db, 'candidates', candidateId), {
    status: CANDIDATE_STATUS.ANULADA,
    lastEditedBy: editor?.uid || null,
    lastEditedByName: editor?.name || null,
    lastEditedAt: serverTimestamp(),
  })

  const [resultsSnap, predictionsSnap] = await Promise.all([
    getDocs(collection(db, 'phaseResults')),
    getDocs(collection(db, 'predictions')),
  ])
  const publishedPhaseKeys = new Set(resultsSnap.docs.map((d) => d.id))

  const batch = writeBatch(db)
  let touched = 0
  predictionsSnap.docs.forEach((d) => {
    const data = d.data()
    if (publishedPhaseKeys.has(data.phase)) return // fase ya publicada: no se toca retroactivamente
    const phase = getPhase(data.phase)
    if (!phase) return

    if (phase.podium) {
      const podium = data.podium || {}
      const patch = {}
      for (const slot of ['winner', 'first', 'second']) {
        if (podium[slot] === candidateId) patch[`podium.${slot}`] = ''
      }
      if (Object.keys(patch).length > 0) {
        batch.update(d.ref, patch)
        touched++
      }
    } else if (Array.isArray(data.picks) && data.picks.includes(candidateId)) {
      batch.update(d.ref, { picks: data.picks.filter((id) => id !== candidateId) })
      touched++
    }
  })
  if (touched > 0) await batch.commit()
  return touched
}

/** Reactiva una candidata anulada por error (los cupos que ya se liberaron
 * en predicciones de otros usuarios no se restauran automáticamente). */
export async function reactivateCandidate(candidateId, editor) {
  await saveCandidate(candidateId, { status: CANDIDATE_STATUS.ACTIVE }, editor)
}

/**
 * Renumera correlativamente (1, 2, 3...) las candidatas ya cargadas,
 * respetando su orden actual — útil para cerrar huecos de numeración
 * (por ejemplo, cuando una candidata se retiró y quedó un salto).
 */
export async function renumberCandidatesSequential() {
  const q = query(collection(db, 'candidates'), orderBy('number', 'asc'))
  const snap = await getDocs(q)
  const batch = writeBatch(db)
  let changed = 0
  snap.docs.forEach((d, index) => {
    const expected = index + 1
    if (d.data().number !== expected) {
      batch.update(d.ref, { number: expected })
      changed++
    }
  })
  if (changed > 0) await batch.commit()
  return changed
}

/**
 * Carga en lote una lista de candidatas (ver `candidatesSeed.js`). Usa un
 * batch de Firestore, así que respeta las mismas reglas de seguridad que
 * `saveCandidate` (solo admin/colaborador). No borra candidatas existentes.
 */
export async function importCandidates(seedList, editor) {
  const batch = writeBatch(db)
  for (const c of seedList) {
    const ref = doc(collection(db, 'candidates'))
    batch.set(ref, {
      number: c.number,
      name: c.name,
      province: c.province,
      photoUrl: c.photoUrl || '',
      bio: c.age ? `${c.age} años` : '',
      status: 'active',
      lastEditedBy: editor?.uid || null,
      lastEditedByName: editor?.name || null,
      lastEditedAt: serverTimestamp(),
    })
  }
  await batch.commit()
}

// ---------- Fases ----------

export function listenPhases(callback) {
  const unsubs = PHASES.map((phase) =>
    onSnapshot(doc(db, 'phases', phase.key), (snap) => {
      callback(phase.key, snap.exists() ? { id: snap.id, ...snap.data() } : null)
    }),
  )
  return () => unsubs.forEach((u) => u())
}

export async function ensurePhaseDocs() {
  for (const phase of PHASES) {
    const ref = doc(db, 'phases', phase.key)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        status: phase.order === 1 ? 'abierta' : 'cerrada',
        deadline: null,
        createdAt: serverTimestamp(),
      })
    }
  }
}

export async function setPhaseConfig(phaseKey, { status, deadline }) {
  const ref = doc(db, 'phases', phaseKey)
  const patch = { updatedAt: serverTimestamp() }
  if (status !== undefined) patch.status = status
  if (deadline !== undefined) patch.deadline = deadline
  // setDoc con merge (en vez de updateDoc) porque el documento de la fase
  // puede no existir todavía la primera vez que el admin la abre.
  await setDoc(ref, patch, { merge: true })
}

/**
 * Solo la Fase 1 tiene temporizador/deadline manual. Al cerrar (o publicar
 * resultados de) una fase, se abre automáticamente SOLO la fase siguiente,
 * nunca todas las restantes de una vez.
 */
export async function openNextPhase(phaseKey) {
  const next = nextPhase(phaseKey)
  if (!next) return
  await setPhaseConfig(next.key, { status: PHASE_STATUS.ABIERTA })
}

// ---------- Resultados oficiales por fase ----------

export function listenPhaseResults(phaseKey, callback) {
  return onSnapshot(doc(db, 'phaseResults', phaseKey), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

export async function getPhaseResults(phaseKey) {
  const snap = await getDoc(doc(db, 'phaseResults', phaseKey))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// ---------- Predicciones ----------

export function predictionDocId(uid, phaseKey) {
  return `${uid}_${phaseKey}`
}

export function listenPrediction(uid, phaseKey, callback) {
  return onSnapshot(doc(db, 'predictions', predictionDocId(uid, phaseKey)), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  })
}

export async function savePrediction(uid, phaseKey, payload) {
  const ref = doc(db, 'predictions', predictionDocId(uid, phaseKey))
  await setDoc(
    ref,
    {
      userId: uid,
      phase: phaseKey,
      ...payload,
      submittedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

async function getAllPredictionsForPhase(phaseKey) {
  const snap = await getDocs(collection(db, 'predictions'))
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.phase === phaseKey)
}

// ---------- Publicar resultados + recalcular puntos (solo admin) ----------

/**
 * IDs de las candidatas que compiten en una fase (de entre las cuales el
 * admin elige quiénes avanzan). En Fase 1 son todas las activas; en las
 * siguientes, las que oficialmente avanzaron en la fase anterior.
 *
 * En ambos casos se excluyen las candidatas 'anulada': si una avanzó
 * oficialmente en la fase previa pero luego se anuló a media competencia,
 * no debe entrar aquí — si no, al publicar esta fase se marcaría como
 * 'eliminated' (pisando su estado real de anulación).
 */
async function getPhaseUniverseIds(phaseKey) {
  const prevPhase = previousPhase(phaseKey)
  const candidatesSnap = await getDocs(collection(db, 'candidates'))
  const annulledIds = new Set(
    candidatesSnap.docs.filter((d) => d.data().status === CANDIDATE_STATUS.ANULADA).map((d) => d.id),
  )

  if (!prevPhase) {
    return candidatesSnap.docs
      .filter((d) => d.data().status !== CANDIDATE_STATUS.ELIMINATED && !annulledIds.has(d.id))
      .map((d) => d.id)
  }
  const prevResult = await getPhaseResults(prevPhase.key)
  return (prevResult?.officialPicks || []).filter((id) => !annulledIds.has(id))
}

function advancingIdsFromOfficialData(phase, officialData) {
  if (phase.podium) {
    return [officialData.podium?.winner, officialData.podium?.first, officialData.podium?.second].filter(Boolean)
  }
  return officialData.officialPicks || []
}

/**
 * Publica el resultado oficial de una fase y recalcula, para TODOS los
 * usuarios, los puntos obtenidos en esa fase. Es seguro volver a llamarla
 * (por ejemplo si el admin corrige un resultado ya publicado): sobreescribe
 * el puntaje de esa fase y vuelve a sumar el total.
 *
 * Además marca automáticamente como `eliminated` a las candidatas del
 * universo de esta fase que NO quedaron entre las que avanzaron, para que
 * ya no aparezcan disponibles en la fase siguiente ni en "Candidatas".
 */
export async function publishPhaseResultsAndRecalculate(phaseKey, officialData) {
  const phase = getPhase(phaseKey)
  const universeIds = await getPhaseUniverseIds(phaseKey)
  const advancingIds = advancingIdsFromOfficialData(phase, officialData)
  const advancingSet = new Set(advancingIds)
  const eliminatedIds = universeIds.filter((id) => !advancingSet.has(id))

  const resultRef = doc(db, 'phaseResults', phaseKey)
  await setDoc(
    resultRef,
    {
      ...officialData,
      eliminatedIds,
      publishedAt: serverTimestamp(),
      status: 'resultados_publicados',
    },
    { merge: true },
  )
  await setPhaseConfig(phaseKey, { status: 'resultados_publicados' })

  if (eliminatedIds.length > 0 || advancingIds.length > 0) {
    const batch = writeBatch(db)
    eliminatedIds.forEach((id) => batch.update(doc(db, 'candidates', id), { status: 'eliminated' }))
    // Por si se está corrigiendo un resultado ya publicado: las que ahora sí
    // avanzan quedan activas de nuevo (por si antes se habían eliminado).
    advancingIds.forEach((id) => batch.update(doc(db, 'candidates', id), { status: 'active' }))
    await batch.commit()
  }

  await recalcPointsForPhase(phaseKey)
}

/**
 * Anula los resultados oficiales ya publicados de una fase: borra el
 * documento de resultados, vuelve a poner la fase en 'cerrada', recalcula
 * los puntos de todos los usuarios (quedan en 0 para esta fase, ya que no
 * hay resultado oficial contra el cual comparar) y reactiva las candidatas
 * que se habían marcado como eliminadas por esta fase. Útil para deshacer
 * una publicación hecha por error (p. ej. sin elegir candidatas).
 */
export async function unpublishPhaseResults(phaseKey) {
  const existing = await getPhaseResults(phaseKey)
  const eliminatedIds = existing?.eliminatedIds || []

  if (eliminatedIds.length > 0) {
    const batch = writeBatch(db)
    eliminatedIds.forEach((id) => batch.update(doc(db, 'candidates', id), { status: 'active' }))
    await batch.commit()
  }

  await deleteDoc(doc(db, 'phaseResults', phaseKey))
  await setPhaseConfig(phaseKey, { status: PHASE_STATUS.CERRADA })
  await recalcPointsForPhase(phaseKey)
}

export async function recalcPointsForPhase(phaseKey) {
  const phase = getPhase(phaseKey)
  if (!phase) return

  const [officialResult, predictions, usersSnap] = await Promise.all([
    getPhaseResults(phaseKey),
    getAllPredictionsForPhase(phaseKey),
    getDocs(collection(db, 'users')),
  ])

  const predictionByUser = new Map(predictions.map((p) => [p.userId, p]))
  const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const batch = writeBatch(db)
  for (const user of users) {
    const prediction = predictionByUser.get(user.id)
    const { points } = scorePrediction(phaseKey, prediction, officialResult)
    const pointsByPhase = { ...(user.pointsByPhase || {}), [phaseKey]: points }
    const totalPoints = sumTotalPoints(pointsByPhase)
    batch.update(doc(db, 'users', user.id), { pointsByPhase, totalPoints })
  }
  await batch.commit()
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Reinicio TOTAL del juego (botón "Zona de peligro" en Fases y resultados,
 * solo admin). Deja todo como si nunca se hubiera jugado ninguna ronda:
 *
 * - Borra TODAS las predicciones de TODOS los usuarios.
 * - Borra TODOS los resultados oficiales publicados (phaseResults).
 * - Las 4 fases quedan como recién creadas: Fase 1 'abierta' sin deadline,
 *   el resto 'cerrada'.
 * - Los puntos (pointsByPhase y totalPoints) de todos los usuarios vuelven a 0.
 * - Todas las candidatas vuelven a 'active' (se quita 'eliminated'/'anulada').
 *
 * NO borra cuentas de usuario, roles, candidatas, ni sus comentarios/reacciones.
 * No se puede deshacer.
 */
export async function resetGame() {
  const [predictionsSnap, resultsSnap, usersSnap, candidatesSnap] = await Promise.all([
    getDocs(collection(db, 'predictions')),
    getDocs(collection(db, 'phaseResults')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'candidates')),
  ])

  const ops = []

  predictionsSnap.docs.forEach((d) => ops.push({ ref: d.ref, type: 'delete' }))
  resultsSnap.docs.forEach((d) => ops.push({ ref: d.ref, type: 'delete' }))

  PHASES.forEach((phase) => {
    ops.push({
      ref: doc(db, 'phases', phase.key),
      type: 'set',
      data: {
        status: phase.order === 1 ? PHASE_STATUS.ABIERTA : PHASE_STATUS.CERRADA,
        deadline: null,
        updatedAt: serverTimestamp(),
      },
    })
  })

  let usersReset = 0
  usersSnap.docs.forEach((d) => {
    const data = d.data()
    if ((data.totalPoints || 0) !== 0 || Object.keys(data.pointsByPhase || {}).length > 0) {
      ops.push({ ref: d.ref, type: 'update', data: { pointsByPhase: {}, totalPoints: 0 } })
      usersReset++
    }
  })

  let candidatesReactivated = 0
  candidatesSnap.docs.forEach((d) => {
    if (d.data().status && d.data().status !== CANDIDATE_STATUS.ACTIVE) {
      ops.push({ ref: d.ref, type: 'update', data: { status: CANDIDATE_STATUS.ACTIVE } })
      candidatesReactivated++
    }
  })

  for (const group of chunk(ops, 450)) {
    const batch = writeBatch(db)
    for (const op of group) {
      if (op.type === 'delete') batch.delete(op.ref)
      else if (op.type === 'set') batch.set(op.ref, op.data, { merge: true })
      else batch.update(op.ref, op.data)
    }
    await batch.commit()
  }

  return {
    predictionsDeleted: predictionsSnap.size,
    resultsDeleted: resultsSnap.size,
    usersReset,
    candidatesReactivated,
  }
}

// ---------- Ranking ----------

export function listenRanking(callback) {
  const q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// ---------- Roles (solo admin) ----------

export async function setUserRole(userId, role) {
  await updateDoc(doc(db, 'users', userId), { role })
}

export function listenUsers(callback) {
  return onSnapshot(collection(db, 'users'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

// ---------- Comentarios y reacciones (sección Candidatas) ----------

export function listenCandidateComments(candidateId, callback) {
  const q = query(collection(db, 'candidates', candidateId, 'comments'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

export async function postCandidateComment(candidateId, text, author) {
  const trimmed = text.trim()
  if (!trimmed) return
  await addDoc(collection(db, 'candidates', candidateId, 'comments'), {
    userId: author.uid,
    userName: author.name || 'Usuario',
    text: trimmed.slice(0, 500),
    createdAt: serverTimestamp(),
  })
}

export async function deleteCandidateComment(candidateId, commentId) {
  await deleteDoc(doc(db, 'candidates', candidateId, 'comments', commentId))
}

/** Un doc por usuario (id = uid): guarda su reacción actual a esa candidata. */
export function listenCandidateReactions(candidateId, callback) {
  return onSnapshot(collection(db, 'candidates', candidateId, 'reactions'), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  })
}

/** Alterna la reacción del usuario: si ya tenía marcada esa misma, la quita;
 * si tenía otra o ninguna, la cambia a `emojiKey`. Cada usuario solo puede
 * tener una reacción activa por candidata. */
export async function toggleMyReaction(candidateId, uid, emojiKey, userName) {
  const ref = doc(db, 'candidates', candidateId, 'reactions', uid)
  const snap = await getDoc(ref)
  if (snap.exists() && snap.data().emojiKey === emojiKey) {
    await deleteDoc(ref)
    return
  }
  await setDoc(ref, { emojiKey, userName: userName || 'Usuario', updatedAt: serverTimestamp() })
}
