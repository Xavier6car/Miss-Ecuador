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
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { PHASES, PHASE_STATUS, getPhase } from './constants'
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
 * Publica el resultado oficial de una fase y recalcula, para TODOS los
 * usuarios, los puntos obtenidos en esa fase. Es seguro volver a llamarla
 * (por ejemplo si el admin corrige un resultado ya publicado): sobreescribe
 * el puntaje de esa fase y vuelve a sumar el total.
 */
export async function publishPhaseResultsAndRecalculate(phaseKey, officialData) {
  const resultRef = doc(db, 'phaseResults', phaseKey)
  await setDoc(
    resultRef,
    {
      ...officialData,
      publishedAt: serverTimestamp(),
      status: 'resultados_publicados',
    },
    { merge: true },
  )
  await setPhaseConfig(phaseKey, { status: 'resultados_publicados' })
  await recalcPointsForPhase(phaseKey)
}

/**
 * Anula los resultados oficiales ya publicados de una fase: borra el
 * documento de resultados, vuelve a poner la fase en 'cerrada' y recalcula
 * los puntos de todos los usuarios (quedan en 0 para esta fase, ya que no
 * hay resultado oficial contra el cual comparar). Útil para deshacer una
 * publicación hecha por error (p. ej. sin elegir candidatas).
 */
export async function unpublishPhaseResults(phaseKey) {
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
