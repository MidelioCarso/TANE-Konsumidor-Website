import { useEffect, useState } from 'react'
import { Pencil, PlusCircle, RefreshCw, Trash2, Users } from 'lucide-react'
import { useAdminAuth } from '../../../context/AdminAuthContext'

const PROTECTED_GROUPS = new Set(['officer_moderator', 'staff', 'content_editor', 'keixa_manager'])

export default function AdminGroupsPage() {
  const { user } = useAdminAuth()
  const [groups, setGroups] = useState([])
  const [newGroupName, setNewGroupName] = useState('')
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const isSuperadmin = Boolean(user?.is_superuser || user?.capabilities?.is_superadmin)

  const loadGroups = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/groups/', { credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Falha atu karga grupos.')
      setGroups(data.groups || [])
      setError('')
    } catch (loadError) {
      setError(loadError.message || 'Falha atu karga grupos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isSuperadmin) return
    loadGroups()
  }, [isSuperadmin])

  const createGroup = async (e) => {
    e.preventDefault()
    if (!newGroupName.trim()) return

    setSubmitting(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await fetch('/api/admin/groups/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Falha atu kria grupo.')
      setNewGroupName('')
      setSuccessMsg('Grupo foun kria ona.')
      await loadGroups()
    } catch (createError) {
      setError(createError.message || 'Falha atu kria grupo.')
    } finally {
      setSubmitting(false)
    }
  }

  const saveEdit = async () => {
    if (!editing?.name?.trim()) return

    setSubmitting(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await fetch(`/api/admin/groups/${editing.id}/`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editing.name.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Falha atu atualiza grupo.')
      setEditing(null)
      setSuccessMsg('Grupo atualiza ona.')
      await loadGroups()
    } catch (updateError) {
      setError(updateError.message || 'Falha atu atualiza grupo.')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteGroup = async (group) => {
    if (!window.confirm(`Delete grupo "${group.name}"?`)) return

    setSubmitting(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await fetch(`/api/admin/groups/${group.id}/`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Falha atu delete grupo.')
      setSuccessMsg('Grupo delete ona.')
      await loadGroups()
    } catch (deleteError) {
      setError(deleteError.message || 'Falha atu delete grupo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isSuperadmin) {
    return (
      <div className="adm-content">
        <div className="adm-empty">
          <div className="adm-empty-icon">
            <Users size={38} strokeWidth={1.4} />
          </div>
          <h3>Asesu restritu</h3>
          <p>Pajina ida ne'e ba superadmin deit.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="adm-topbar">
        <div className="adm-topbar-breadcrumb">
          <span>Admin</span>
          <span className="sep">/</span>
          <span className="current">Jere Groups</span>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">Jestaun Groups</h1>
            <p className="adm-page-subtitle">Halo no organiza grupos/roles ba sistema admin.</p>
          </div>
          <button className="adm-btn adm-btn-secondary" onClick={loadGroups} disabled={loading}>
            <RefreshCw size={15} strokeWidth={2} />
            Atualiza
          </button>
        </div>

        {error ? <div className="adm-login-error">{error}</div> : null}
        {successMsg ? <div className="adm-success-banner">{successMsg}</div> : null}

        <div className="adm-card" style={{ marginBottom: 16 }}>
          <form onSubmit={createGroup} className="adm-toolbar" style={{ marginBottom: 0 }}>
            <div className="adm-form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label>Naran Grupo Foun</label>
              <input
                className="adm-input"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ex: media_team"
              />
            </div>
            <button className="adm-btn adm-btn-primary" type="submit" disabled={submitting}>
              <PlusCircle size={15} />
              Kria Grupo
            </button>
          </form>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Naran Grupo</th>
                <th>Total Users</th>
                <th>Asoens</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3}>Loading...</td>
                </tr>
              ) : groups.length ? (
                groups.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <div className="adm-td-title">
                        <strong>{group.name}</strong>
                        <p>ID: {group.id}</p>
                      </div>
                    </td>
                    <td>{group.user_count ?? 0}</td>
                    <td className="adm-td-actions">
                      <button
                        className="adm-btn adm-btn-secondary adm-btn-sm"
                        onClick={() => setEditing(group)}
                        disabled={PROTECTED_GROUPS.has(group.name)}
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        className="adm-btn adm-btn-danger adm-btn-sm"
                        onClick={() => deleteGroup(group)}
                        disabled={PROTECTED_GROUPS.has(group.name)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>Seidauk iha grupo.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing ? (
        <div className="adm-modal-overlay" onClick={() => setEditing(null)}>
          <div className="adm-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h3>Edit Grupo</h3>
            <div className="adm-form-group" style={{ marginBottom: 0 }}>
              <label>Naran</label>
              <input
                className="adm-input"
                value={editing.name}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn-secondary" onClick={() => setEditing(null)} disabled={submitting}>Kansela</button>
              <button className="adm-btn adm-btn-primary" onClick={saveEdit} disabled={submitting}>
                {submitting ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
