import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

/**
 * Sube la foto de una candidata a Firebase Storage y devuelve la URL
 * pública de descarga, lista para guardar en `candidates/{id}.photoUrl`.
 * Solo admin/colaborador pueden escribir ahí (ver storage.rules).
 */
export async function uploadCandidatePhoto(candidateId, file) {
  if (!file) throw new Error('No se seleccionó ningún archivo.')
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.')
  if (file.size > MAX_SIZE_BYTES) throw new Error('La imagen no puede pesar más de 5MB.')

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `candidates/${candidateId}-${Date.now()}.${ext}`
  const fileRef = ref(storage, path)
  await uploadBytes(fileRef, file, { contentType: file.type })
  return getDownloadURL(fileRef)
}
