import { useEffect, useMemo, useState } from 'react'
import { listenCandidates, listenRecentComments, listenRecentReactions } from '../../lib/data'
import { REACTIONS } from '../../lib/constants'

function candidateLabel(candidatesById, candidateId) {
  const c = candidatesById.get(candidateId)
  if (!c) return 'una candidata que ya no existe'
  return `#${c.number ?? '-'} ${c.name}`
}

function formatWhen(ts) {
  if (!ts?.toDate) return ''
  return ts.toDate().toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function millisOf(ts) {
  return ts?.toMillis ? ts.toMillis() : 0
}

/** Feed de actividad de todos los jugadores (comentarios + reacciones) en
 * todas las candidatas, más reciente primero. Solo para admin/colaborador. */
export default function AdminActivity() {
  const [candidates, setCandidates] = useState([])
  const [comments, setComments] = useState([])
  const [reactions, setReactions] = useState([])

  useEffect(() => listenCandidates(setCandidates), [])
  useEffect(() => listenRecentComments(setComments), [])
  useEffect(() => listenRecentReactions(setReactions), [])

  const candidatesById = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates])
  const reactionByKey = useMemo(() => new Map(REACTIONS.map((r) => [r.key, r])), [])

  const feed = useMemo(() => {
    const commentItems = comments.map((c) => ({
      kind: 'comment',
      key: `comment_${c.id}`,
      userName: c.userName || 'Usuario',
      candidateId: c.candidateId,
      text: c.text,
      when: c.createdAt,
    }))
    const reactionItems = reactions.map((r) => ({
      kind: 'reaction',
      key: `reaction_${r.candidateId}_${r.id}`,
      userName: r.userName || 'Usuario',
      candidateId: r.candidateId,
      emoji: reactionByKey.get(r.emojiKey)?.emoji || '❤️',
      when: r.updatedAt,
    }))
    return [...commentItems, ...reactionItems].sort((a, b) => millisOf(b.when) - millisOf(a.when))
  }, [comments, reactions, reactionByKey])

  return (
    <div className="card">
      <h3 style={{ marginBottom: 4 }}>Actividad de los jugadores</h3>
      <p className="text-dim" style={{ marginTop: 0 }}>
        Comentarios y reacciones de todos los jugadores en todas las candidatas, más reciente primero.
      </p>

      {feed.length === 0 && (
        <p className="text-dim" style={{ fontSize: 13 }}>
          Todavía no hay comentarios ni reacciones de los jugadores.
        </p>
      )}

      <div className="comment-list" style={{ maxHeight: 'none' }}>
        {feed.map((item) => (
          <div className="comment-item" key={item.key}>
            <div className="comment-item-head">
              <span className="comment-author">{item.userName}</span>
              <span className="text-dim" style={{ fontSize: 11 }}>{formatWhen(item.when)}</span>
            </div>
            {item.kind === 'comment' ? (
              <p className="comment-text">
                comentó en <strong>{candidateLabel(candidatesById, item.candidateId)}</strong>: “{item.text}”
              </p>
            ) : (
              <p className="comment-text">
                reaccionó {item.emoji} a <strong>{candidateLabel(candidatesById, item.candidateId)}</strong>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
