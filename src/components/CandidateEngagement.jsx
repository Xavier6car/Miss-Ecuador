import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { REACTIONS } from '../lib/constants'
import {
  listenCandidateComments,
  postCandidateComment,
  deleteCandidateComment,
  listenCandidateReactions,
  toggleMyReaction,
} from '../lib/data'

function formatCommentDate(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleString('es-EC', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** Comentarios + reacciones de una candidata. Se usa dentro del modal de la
 * sección "Candidatas" (no en Predicción, para no distraer al elegir). */
export default function CandidateEngagement({ candidateId }) {
  const { profile, canManageCandidates } = useAuth()
  const [comments, setComments] = useState([])
  const [reactions, setReactions] = useState([])
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [reacting, setReacting] = useState(false)

  useEffect(() => listenCandidateComments(candidateId, setComments), [candidateId])
  useEffect(() => listenCandidateReactions(candidateId, setReactions), [candidateId])

  const myReaction = reactions.find((r) => r.id === profile?.id)?.emojiKey || null
  const countsByKey = reactions.reduce((acc, r) => {
    acc[r.emojiKey] = (acc[r.emojiKey] || 0) + 1
    return acc
  }, {})

  async function handleReact(key) {
    if (!profile || reacting) return
    setReacting(true)
    try {
      await toggleMyReaction(candidateId, profile.id, key, profile.name)
    } finally {
      setReacting(false)
    }
  }

  async function handlePost(e) {
    e.preventDefault()
    if (!profile || !text.trim() || posting) return
    setPosting(true)
    try {
      await postCandidateComment(candidateId, text, { uid: profile.id, name: profile.name })
      setText('')
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(commentId) {
    if (!confirm('¿Borrar este comentario?')) return
    await deleteCandidateComment(candidateId, commentId)
  }

  return (
    <div className="engagement">
      <div className="reaction-row">
        {REACTIONS.map((r) => (
          <button
            key={r.key}
            type="button"
            className={`reaction-btn${myReaction === r.key ? ' active' : ''}`}
            disabled={reacting}
            title={r.label}
            onClick={() => handleReact(r.key)}
          >
            <span>{r.emoji}</span>
            {countsByKey[r.key] > 0 && <span className="reaction-count">{countsByKey[r.key]}</span>}
          </button>
        ))}
      </div>

      <h4 className="engagement-heading">Comentarios{comments.length > 0 ? ` (${comments.length})` : ''}</h4>

      <form className="comment-form" onSubmit={handlePost}>
        <textarea
          rows={2}
          maxLength={500}
          placeholder="Escribe un comentario..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-sm btn-primary" type="submit" disabled={posting || !text.trim()}>
          {posting ? 'Publicando...' : 'Publicar'}
        </button>
      </form>

      <div className="comment-list">
        {comments.length === 0 && <p className="text-dim" style={{ fontSize: 13 }}>Sé el primero en comentar.</p>}
        {comments.map((c) => (
          <div className="comment-item" key={c.id}>
            <div className="comment-item-head">
              <span className="comment-author">{c.userName}</span>
              <span className="text-dim" style={{ fontSize: 11 }}>{formatCommentDate(c.createdAt)}</span>
              {(c.userId === profile?.id || canManageCandidates) && (
                <button
                  type="button"
                  className="comment-delete"
                  onClick={() => handleDelete(c.id)}
                  aria-label="Borrar comentario"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="comment-text">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
