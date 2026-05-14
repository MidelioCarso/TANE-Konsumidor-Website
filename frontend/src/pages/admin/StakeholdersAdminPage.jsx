import { useEffect, useState, useMemo } from 'react'
import { PlusCircle, Pencil, Trash2, X, Save, Users, AlertCircle, CheckCircle, Search } from 'lucide-react'
import Pagination from '../../components/admin/Pagination'
import useUnsavedForm from '../../hooks/useUnsavedForm'
import AdminUnsavedNotice from '../../components/admin/AdminUnsavedNotice'

function Modal({ item, nextOrder, onClose, onSave, saving, error }) {
  const isEdit = Boolean(item?.id)
  const [form, setForm] = useState(item || { name: '', title: '', subtitle: '', display_order: nextOrder })
  const set = (f, v) => setForm((p) => ({ ...p, [f]: v }))
  const { isDirty, isFieldDirty } = useUnsavedForm(form, true)

  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Stakeholder' : 'Aumenta Stakeholder Foun'}</h3>
          <button className="adm-btn-icon" onClick={onClose} style={{ color: '#8aab98' }}><X size={18} /></button>
        </div>
        {error && <div className="adm-alert adm-alert--error" style={{ marginBottom: 16 }}><AlertCircle size={15} />{error}</div>}
        <AdminUnsavedNotice show={isDirty} message="Mudansa iha form modal ne'e seidauk save." />
        <div className="adm-form-group">
          <label>Naran *</label>
          <input className={`adm-input${isFieldDirty('name') ? ' adm-input--dirty' : ''}`} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Ministériu Finansas..." />
        </div>
        <div className="adm-form-group">
          <label>Títulu / Kategória</label>
          <input className={`adm-input${isFieldDirty('title') ? ' adm-input--dirty' : ''}`} value={form.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Ex: Parseiru Governamentál, Sosiedade Sivíl..." />
          <small style={{ color: 'var(--adm-text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>Label kategória ne'ebé sai iha kartu (opsionál).</small>
        </div>
        <div className="adm-form-group">
          <label>Subtítulu / Deskrisaun</label>
          <textarea className={`adm-textarea${isFieldDirty('subtitle') ? ' adm-textarea--dirty' : ''}`} value={form.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} placeholder="Deskrisaun badak kona-ba parseiru..." style={{ minHeight: 80 }} />
          <small style={{ color: 'var(--adm-text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>Deskrisaun opsionál ne'ebé sai iha kraik kartu.</small>
        </div>
        <div className="adm-form-group">
          <label>Pozisaun iha Lista</label>
          <input className={`adm-input${isFieldDirty('display_order') ? ' adm-input--dirty' : ''}`} type="number" min="1" value={form.display_order} onChange={(e) => set('display_order', Math.max(1, parseInt(e.target.value) || 1))} style={{ maxWidth: 100 }} />
          <small style={{ color: 'var(--adm-text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>1 = hatudu dahuluk · número aas liu = ikus. Automátiku seta ba posisaun ikus.</small>
        </div>
        <div className="adm-modal-actions">
          <button className="adm-btn adm-btn-secondary" onClick={onClose} disabled={saving}>Kansela</button>
          <button className="adm-btn adm-btn-primary" onClick={() => onSave(form)} disabled={saving}>
            {saving ? <><span className="adm-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Save...</> : <><Save size={14} />{isEdit ? 'Atualiza' : 'Kria'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StakeholdersAdminPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [modalError, setModalError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/stakeholders/', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setItems(d.stakeholders || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const flash = (msg) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items
  }, [items, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  useEffect(() => setPage(1), [search, perPage])

  const handleSave = async (form) => {
    if (!form.name.trim()) { setModalError('Naran obrigatóriu.'); return }
    setSaving(true); setModalError('')
    const isEdit = Boolean(form.id)
    const url = isEdit ? `/api/admin/stakeholders/${form.id}/` : '/api/admin/stakeholders/'
    const method = isEdit ? 'PUT' : 'POST'
    try {
      const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Operasaun la susesu.')
      setModal(null); load(); flash(isEdit ? 'Stakeholder atualiza.' : 'Stakeholder kria.')
    } catch (err) { setModalError(err.message) } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/admin/stakeholders/${deleteTarget.id}/`, { method: 'DELETE', credentials: 'same-origin' })
      setDeleteTarget(null); load(); flash('Stakeholder deleta.')
    } finally { setDeleting(false) }
  }

  return (
    <>
      <div className="adm-topbar">
        <div className="adm-topbar-breadcrumb">
          <span>Admin</span><span className="sep">/</span><span className="current">Stakeholders</span>
        </div>
        <div className="adm-topbar-actions">
          <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => { setModalError(''); setModal({ item: null, nextOrder: items.length + 1 }) }}>
            <PlusCircle size={15} />Aumenta Stakeholder
          </button>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">Stakeholders Xave</h1>
            <p className="adm-page-subtitle">Parseiru institusionál no komunidade sira ne'ebé TANE servisu hamutuk.</p>
          </div>
        </div>

        {success && <div className="adm-alert adm-alert--success"><CheckCircle size={16} />{success}</div>}

        {/* Toolbar */}
        <div className="adm-toolbar">
          <div className="adm-search-bar">
            <Search size={16} style={{ color: '#8aab98', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buka stakeholder..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8aab98', padding: 0, display: 'flex' }} onClick={() => setSearch('')} title="Hamoos">
                <X size={14} />
              </button>
            )}
          </div>
          <span style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {filtered.length} rezultadu
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><div className="adm-spinner" style={{ margin: '0 auto' }} /></div>
        ) : filtered.length ? (
          <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>Naran Stakeholder</th>
                  <th>Títulu / Kategória</th>
                  <th style={{ width: 80 }}>Ordem</th>
                  <th style={{ width: 100 }}>Aksaun</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--adm-text-muted)', fontWeight: 600 }}>{String((page - 1) * perPage + idx + 1).padStart(2, '0')}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                      {item.subtitle && <div style={{ color: 'var(--adm-text-muted)', fontSize: '0.78rem', marginTop: 2 }}>{item.subtitle.length > 80 ? item.subtitle.slice(0, 80) + '…' : item.subtitle}</div>}
                    </td>
                    <td>{item.title ? <span style={{ background: '#e8f5ee', color: '#0f5f37', borderRadius: 4, padding: '2px 8px', fontSize: '0.8rem', fontWeight: 600 }}>{item.title}</span> : <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.8rem' }}>—</span>}</td>
                    <td style={{ textAlign: 'center' }}><span style={{ background: 'var(--adm-bg-hover,#edf5f0)', color: 'var(--adm-text-secondary)', borderRadius: 4, padding: '2px 8px', fontSize: '0.8rem', fontWeight: 600 }}>#{item.display_order}</span></td>
                    <td>
                      <div className="adm-td-actions">
                        <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={() => { setModalError(''); setModal({ item }) }}><Pencil size={13} /></button>
                        <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setDeleteTarget(item)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            perPage={perPage}
            onPerPageChange={setPerPage}
            totalItems={filtered.length}
          />
          </>
        ) : (
          <div className="adm-table-wrap">
            <div className="adm-empty">
              <div className="adm-empty-icon"><Users size={40} strokeWidth={1} /></div>
              <h3>{search ? 'La iha rezultadu buka nian' : 'Seidauk iha stakeholder'}</h3>
              <p>{search ? `La hetan stakeholder ho "${search}".` : 'Aumenta stakeholder dahuluk.'}</p>
              {!search && <button className="adm-btn adm-btn-primary" onClick={() => { setModalError(''); setModal({ item: null, nextOrder: 1 }) }}><PlusCircle size={15} />Aumenta Stakeholder</button>}
            </div>
          </div>
        )}
      </div>

      {modal !== null && (
        <Modal item={modal.item} nextOrder={modal.nextOrder} onClose={() => setModal(null)} onSave={handleSave} saving={saving} error={modalError} />
      )}

      {deleteTarget && (
        <div className="adm-modal-overlay">
          <div className="adm-modal">
            <h3>Konfirma Delete</h3>
            <p>Ita boot hakarak delete stakeholder <strong>"{deleteTarget.name}"</strong>?</p>
            <div className="adm-modal-actions">
              <button className="adm-btn adm-btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Kansela</button>
              <button className="adm-btn adm-btn-danger" style={{ background: '#d93025', color: '#fff', padding: '10px 20px' }} onClick={handleDelete} disabled={deleting}>{deleting ? 'Deletando...' : 'Sim, Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
