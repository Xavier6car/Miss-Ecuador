import { useEffect, useState } from 'react'
import { listenCandidates } from '../lib/data'
import { CANDIDATE_STATUS } from '../lib/constants'

export default function Rules() {
  const [candidateCount, setCandidateCount] = useState(0)

  useEffect(
    () =>
      listenCandidates((candidates) =>
        setCandidateCount(
          candidates.filter((c) => c.status !== CANDIDATE_STATUS.ELIMINATED && c.status !== CANDIDATE_STATUS.ANULADA)
            .length,
        ),
      ),
    [],
  )

  return (
    <div className="container">
      <span className="eyebrow">Cómo funciona</span>
      <h1 className="page-title">Reglas</h1>
      <p className="page-subtitle">Todo lo que necesitas saber para jugar la Predicción de Miss Universo Ecuador.</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Fases</h3>
        <ol>
          <li>
            <strong>Fase 1 – Top 15:</strong> elige 15 de las {candidateCount || 26} candidatas que crees
            pasarán al corte.
          </li>
          <li><strong>Fase 2 – Top 10:</strong> de las 15 reales que avanzaron, elige 10.</li>
          <li><strong>Fase 3 – Top 5:</strong> de las 10 reales que avanzaron, elige 5.</li>
          <li><strong>Fase 4 – Podio final:</strong> predice Ganadora, 1ra Finalista y 2da Finalista, en orden exacto, entre las 5 reales.</li>
        </ol>
        <p className="text-dim">
          Cada fase tiene un deadline configurado por el admin. Una vez cerrada una fase, no se puede
          modificar la predicción.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Sistema de puntos</h3>
        <table>
          <thead>
            <tr>
              <th>Evento</th>
              <th>Puntos</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Candidata predicha correctamente en el Top 15</td><td>5 c/u</td></tr>
            <tr><td>Candidata predicha correctamente en el Top 10</td><td>10 c/u</td></tr>
            <tr><td>Candidata predicha correctamente en el Top 5</td><td>20 c/u</td></tr>
            <tr><td>Acertar la Ganadora exacta</td><td>50</td></tr>
            <tr><td>Acertar la 1ra Finalista exacta</td><td>30</td></tr>
            <tr><td>Acertar la 2da Finalista exacta</td><td>20</td></tr>
            <tr><td>Bonus "Top 5 perfecto" (acertaste las 5, sin importar orden)</td><td>+25</td></tr>
          </tbody>
        </table>
        <p className="text-dim" style={{ marginTop: 10 }}>
          El puntaje es acumulativo entre fases — puedes seguir sumando aunque falles en una fase posterior.
        </p>
      </div>

      <div className="card">
        <h3>Otras reglas</h3>
        <ul>
          <li>Los puntos de una fase se calculan solo sobre candidatas que siguen vigentes (no se puede predecir sobre alguien ya eliminada).</li>
          <li>
            En caso de empate en el ranking final, el desempate es: (1) quién acertó la ganadora exacta,
            (2) quién sumó más puntos en el Top 5, (3) orden de registro.
          </li>
          <li>Los resultados oficiales publicados por el admin son inapelables.</li>
        </ul>
      </div>
    </div>
  )
}
