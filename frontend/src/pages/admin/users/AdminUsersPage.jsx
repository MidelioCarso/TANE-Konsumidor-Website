import { useEffect, useMemo, useState } from 'react'
import { Pencil, RefreshCw, Search, Trash2, UserPlus, Users } from 'lucide-react'
import { useAdminAuth } from '../../../context/AdminAuthContext'

const emptyCreate = {
  username: '',
  email: '',
  password: '',
  is_active: true,
  is_superuser: false,
  role: 'staff',
}

const SYSTEM_ROLE_GROUPS = new Set(['officer_moderator', 'staff', 'content_editor', 'keixa_manager'])

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'officer_moderator', label: 'Officer / Moderator' },
  { value: 'super_admin', label: 'Super Admin' },
]

const roleLabelMap = {
  super_admin: 'Super Admin',
  officer_moderator: 'Officer / Moderator',
  staff: 'Staff',
  none: 'No Role',
}

function userBadge(isTrue, trueText, falseText = '') {
  if (!isTrue && !falseText) return null
  return (
    <span className={`adm-badge ${isTrue ? 'adm-badge--green' : 'adm-badge--amber'}`}>
      {isTrue ? trueText : falseText}
    </span>
  )
}

export default function AdminUsersPage() {
  const { user } = useAdminAuth()
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [createForm, setCreateForm] = useState(emptyCreate)

  const isSuperadmin = Boolean(user?.is_superuser || user?.capabilities?.is_superadmin)

  const loadData = async (search = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())

      const usersRes = await fetch(`/api/admin/users/?${params.toString()}`, { credentials: 'same-origin' })

      const usersData = await usersRes.json().catch(() => ({}))

      if (!usersRes.ok) throw new Error(usersData.error || 'Falha atu karga utilizadores.')

      setUsers(usersData.users || [])
      setError('')
    } catch (loadError) {
      setError(loadError.message || 'Falha atu karga dadus utilizador.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isSuperadmin) return
    loadData('')
  }, [isSuperadmin])

  const roleLabel = (role) => roleLabelMap[role] || 'No Role'

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'is_superuser' && value) {
        next.role = 'super_admin'
      }
      if (field === 'role') {
        next.is_superuser = value === 'super_admin'
      }
      return next
    })
  }

  const createUser = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const res = await fetch('/api/admin/users/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Falha atu kria utilizador.')

      setCreateForm(emptyCreate)
      setSuccessMsg('Utilizador foun kria ona.')
      await loadData(query)
    } catch (createError) {
      setError(createError.message || 'Falha atu kria utilizador.')
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (item) => {
    setEditing({
      id: item.id,
      username: item.username || '',
      email: item.email || '',
      password: '',
      is_active: Boolean(item.is_active),
      is_superuser: Boolean(item.is_superuser),
      role: item.role || (item.is_superuser ? 'super_admin' : 'none'),
    })
  }

  const toggleBlockUser = async (item) => {
    if (item.is_superuser) {
      setError('Labele blokia superadmin.')
      return
    }

    const nextActive = !item.is_active
    const actionLabel = nextActive ? 'unblock' : 'block'
    if (!window.confirm(`Hakarak ${actionLabel} utilizador "${item.username}"?`)) return

    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const res = await fetch(`/api/admin/users/${item.id}/`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Falha atu atualiza status utilizador.')

      setSuccessMsg(nextActive ? 'Utilizador unblock ona.' : 'Utilizador block ona.')
      await loadData(query)
    } catch (updateError) {
      setError(updateError.message || 'Falha atu atualiza status utilizador.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateUser = async () => {
    if (!editing) return
    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const res = await fetch(`/api/admin/users/${editing.id}/`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Falha atu atualiza utilizador.')

      setEditing(null)
      setSuccessMsg('Utilizador atualiza ona.')
      await loadData(query)
    } catch (updateError) {
      setError(updateError.message || 'Falha atu atualiza utilizador.')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteUser = async (item) => {
    if (!window.confirm(`Delete utilizador "${item.username}"?`)) return

    setSubmitting(true)
    setError('')
    setSuccessMsg('')

    try {
      const res = await fetch(`/api/admin/users/${item.id}/`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Falha atu delete utilizador.')

      setSuccessMsg('Utilizador delete ona.')
      await loadData(query)
    } catch (deleteError) {
      setError(deleteError.message || 'Falha atu delete utilizador.')
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
          <span className="current">Jere Utilizadores</span>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">Jestaun Utilizadores</h1>
            <p className="adm-page-subtitle">Kria, atualiza no organiza utilizadores iha admin-panel.</p>
          </div>
          <button className="adm-btn adm-btn-secondary" onClick={() => loadData(query)} disabled={loading}>
            <RefreshCw size={15} strokeWidth={2} />
            Atualiza
          </button>
        </div>

        {error ? <div className="adm-login-error">{error}</div> : null}
        {successMsg ? <div className="adm-success-banner">{successMsg}</div> : null}

        <div className="adm-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <UserPlus size={18} />
            <strong>Kria Utilizador Foun</strong>
          </div>
          <form onSubmit={createUser}>
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label>Username</label>
                <input className="adm-input" value={createForm.username} onChange={(e) => handleCreateChange('username', e.target.value)} required />
              </div>
              <div className="adm-form-group">
                <label>Email</label>
                <input className="adm-input" type="email" value={createForm.email} onChange={(e) => handleCreateChange('email', e.target.value)} />
              </div>
              <div className="adm-form-group">
                <label>Password</label>
                <input className="adm-input" type="password" value={createForm.password} onChange={(e) => handleCreateChange('password', e.target.value)} required />
              </div>
            </div>

            <div className="adm-inline-checks" style={{ marginBottom: 12 }}>
              <label><input type="checkbox" checked={createForm.is_active} onChange={(e) => handleCreateChange('is_active', e.target.checked)} /> Active</label>
              <label><input type="checkbox" checked={createForm.is_superuser} onChange={(e) => handleCreateChange('is_superuser', e.target.checked)} /> Superadmin</label>
            </div>

            <div className="adm-form-group" style={{ marginBottom: 12 }}>
              <label>Role</label>
              <select className="adm-select" value={createForm.role} onChange={(e) => handleCreateChange('role', e.target.value)}>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="adm-modal-actions" style={{ marginTop: 14 }}>
              <button className="adm-btn adm-btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Kria Utilizador'}
              </button>
            </div>
          </form>
        </div>

        <div className="adm-toolbar" style={{ marginBottom: 12 }}>
          <div className="adm-search-bar">
            <Search size={15} strokeWidth={2} />
            <input
              className="adm-input"
              placeholder="Buka username ka email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') loadData(e.currentTarget.value)
              }}
            />
          </div>
          <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => loadData(query)}>
            Buka
          </button>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Status</th>
                <th>Roles</th>
                <th>Asoens</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>Loading...</td>
                </tr>
              ) : users.length ? (
                users.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="adm-td-title">
                        <strong>{item.username}</strong>
                        <p>ID: {item.id}</p>
                      </div>
                    </td>
                    <td>{item.email || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {userBadge(item.is_active, 'Active', 'Inactive')}
                        {item.is_superuser ? userBadge(true, 'Superadmin') : null}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="adm-badge adm-badge--blue">{roleLabel(item.role)}</span>
                        {(item.groups || []).filter((g) => !SYSTEM_ROLE_GROUPS.has(g.name)).length
                          ? <span className="adm-badge adm-badge--amber">{(item.groups || []).filter((g) => !SYSTEM_ROLE_GROUPS.has(g.name)).map((g) => g.name).join(', ')}</span>
                          : null}
                      </div>
                    </td>
                    <td className="adm-td-actions">
                      <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => openEdit(item)}>
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        className="adm-btn adm-btn-secondary adm-btn-sm"
                        onClick={() => toggleBlockUser(item)}
                        disabled={item.is_superuser || submitting}
                      >
                        {item.is_active ? 'Block' : 'Unblock'}
                      </button>
                      <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => deleteUser(item)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>Seidauk iha utilizador.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing ? (
        <div className="adm-modal-overlay" onClick={() => setEditing(null)}>
          <div className="adm-modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <h3>Edit Utilizador</h3>
            <div className="adm-form-row">
              <div className="adm-form-group">
                <label>Username</label>
                <input className="adm-input" value={editing.username} onChange={(e) => setEditing((p) => ({ ...p, username: e.target.value }))} />
              </div>
              <div className="adm-form-group">
                <label>Email</label>
                <input className="adm-input" type="email" value={editing.email} onChange={(e) => setEditing((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="adm-form-group">
                <label>Password Foun (optional)</label>
                <input className="adm-input" type="password" value={editing.password} onChange={(e) => setEditing((p) => ({ ...p, password: e.target.value }))} />
              </div>
            </div>

            <div className="adm-inline-checks" style={{ marginBottom: 12 }}>
              <label><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing((p) => ({ ...p, is_active: e.target.checked }))} /> Active</label>
              <label><input type="checkbox" checked={editing.is_superuser} onChange={(e) => setEditing((p) => ({ ...p, is_superuser: e.target.checked, role: e.target.checked ? 'super_admin' : (p.role === 'super_admin' ? 'staff' : p.role) }))} /> Superadmin</label>
            </div>

            <div className="adm-form-group" style={{ marginBottom: 12 }}>
              <label>Role</label>
              <select
                className="adm-select"
                value={editing.role}
                onChange={(e) => setEditing((p) => ({ ...p, role: e.target.value, is_superuser: e.target.value === 'super_admin' }))}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn-secondary" onClick={() => setEditing(null)} disabled={submitting}>Kansela</button>
              <button className="adm-btn adm-btn-primary" onClick={updateUser} disabled={submitting}>
                {submitting ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
