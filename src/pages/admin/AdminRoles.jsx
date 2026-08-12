import { useEffect, useState } from 'react'
import { listenUsers, setUserRole } from '../../lib/data'
import { ROLES } from '../../lib/constants'
import { useAuth } from '../../context/AuthContext'

export default function AdminRoles() {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])

  useEffect(() => listenUsers(setUsers), [])

  async function handleRoleChange(userId, role) {
    await setUserRole(userId, role)
  }

  return (
    <div className="card">
      <h3>Gestión de roles</h3>
      <p className="text-dim">
        Asigna el rol de <strong>colaborador</strong> a las personas que ayudarán a cargar candidatas.
        Solo el admin puede abrir/cerrar fases, publicar resultados y gestionar roles.
      </p>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select
                  value={u.role}
                  disabled={u.id === profile.id}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                >
                  <option value={ROLES.USUARIO}>Usuario</option>
                  <option value={ROLES.COLABORADOR}>Colaborador</option>
                  <option value={ROLES.ADMIN}>Admin</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
