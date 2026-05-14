import { useEffect, useState, useMemo } from 'react'
import { PlusCircle, Pencil, Trash2, X, Save, ClipboardList, AlertCircle, CheckCircle, Search } from 'lucide-react'
import Pagination from '../../components/admin/Pagination'
import RichEditor from '../../components/admin/RichEditor'
import useUnsavedForm from '../../hooks/useUnsavedForm'
import AdminUnsavedNotice from '../../components/admin/AdminUnsavedNotice'

const EMPTY = { objetivu: '', atividade: '', sasukat: '' }

function Modal({ item, nextOrder, onClose, onSave, saving, error }) {
  const isEdit = Boolean(item?.id)
  const [form, setForm] = useState(item ? {
    id: item.id,
    objetivu: item.objetivu,
    atividade: item.atividade,
    sasukat: item.sasukat,
    display_order: item.display_order,
  } : { ...EMPTY, display_order: nextOrder })
  const set = (f, v) => setForm((p) => ({ ...p, [f]: v }))
  const { isDirty, isFieldDirty } = useUnsavedForm(form, true)

  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal" style={{ maxWidth: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Estratejia' : 'Aumenta Estratejia Foun'}</h3>
          <button className="adm-btn-icon" onClick={onClose} style={{ color: '#8aab98' }}><X size={18} /></button>
        </div>
        {error && <div className="adm-alert adm-alert--error" style={{ marginBottom: 16 }}><AlertCircle size={15} />{error}</div>}
        <AdminUnsavedNotice show={isDirty} message="Mudansa iha form modal ne'e seidauk save." />
        <div className="adm-form-group">
          <label>Objetivu Estratejiku *</label>
          <div className={isFieldDirty('objetivu') ? 'adm-rich-dirty-wrap' : ''}>
            <RichEditor
              value={form.objetivu}
              onChange={(html) => set('objetivu', html)}
              compact
              minHeight={80}
              placeholder="Objetivu estratejiku..."
            />
          </div>
        </div>
        <div className="adm-form-group">
          <label>Atividade Estratejiku *</label>
          <div className={isFieldDirty('atividade') ? 'adm-rich-dirty-wrap' : ''}>
            <RichEditor
              value={form.atividade}
              onChange={(html) => set('atividade', html)}
              compact
              minHeight={80}
              placeholder="Atividade estratejiku..."
            />
          </div>
        </div>
        <div className="adm-form-group">
          <label>Sasukat Susesu Nian *</label>
          <div className={isFieldDirty('sasukat') ? 'adm-rich-dirty-wrap' : ''}>
            <RichEditor
              value={form.sasukat}
              onChange={(html) => set('sasukat', html)}
              compact
              minHeight={80}
              placeholder="Sasukat susesu..."
            />
          </div>
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

export default function EstrategiaAdminPage() {
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
    fetch('/api/admin/estrategia/', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setItems(d.estrategia || []))
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
    if (!q) return items
    return items.filter(
      (i) =>
        i.objetivu.toLowerCase().includes(q) ||
        i.atividade.toLowerCase().includes(q) ||
        i.sasukat.toLowerCase().includes(q)
    )
  }, [items, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  useEffect(() => setPage(1), [search, perPage])

  const handleSave = async (form) => {
    if (!form.objetivu.trim() || !form.atividade.trim() || !form.sasukat.trim()) {
      setModalError('Kampu hotu-hotu obrigatóriu.'); return
    }
    setSaving(true); setModalError('')
    const isEdit = Boolean(form.id)
    const url = isEdit ? `/api/admin/estrategia/${form.id}/` : '/api/admin/estrategia/'
    const method = isEdit ? 'PUT' : 'POST'
    try {
      const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Operasaun la susesu.')
      setModal(null); load(); flash(isEdit ? 'Estratejia atualiza.' : 'Estratejia kria.')
    } catch (err) { setModalError(err.message) } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await fetch(`/api/admin/estrategia/${deleteTarget.id}/`, { method: 'DELETE', credentials: 'same-origin' })
      setDeleteTarget(null); load(); flash('Estratejia deleta.')
    } finally { setDeleting(false) }
  }

  return (
    <>
      <div className="adm-topbar">
        <div className="adm-topbar-breadcrumb">
          <span>Admin</span><span className="sep">/</span><span className="current">Planu Estratejiku</span>
        </div>
        <div className="adm-topbar-actions">
          <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => { setModalError(''); setModal({ item: null, nextOrder: items.length + 1 }) }}>
            <PlusCircle size={15} />Aumenta Estratejia
          </button>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">Planu Estratejiku</h1>
            <p className="adm-page-subtitle">Halo jestaun objetivu, atividade no sasukat susesu TANE nian.</p>
          </div>
        </div>

        {success && <div className="adm-alert adm-alert--success"><CheckCircle size={16} />{success}</div>}

        <div className="adm-toolbar">
          <div className="adm-search-bar">
            <Search size={16} style={{ color: '#8aab98', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buka objetivu, atividade ka sasukat..."
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
                  <th>Objetivu Estratejiku</th>
                  <th>Atividade Estratejiku</th>
                  <th>Sasukat Susesu</th>
                  <th style={{ width: 72 }}>Ordem</th>
                  <th style={{ width: 100 }}>Aksaun</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--adm-text-muted)', fontWeight: 600 }}>{String((page - 1) * perPage + idx + 1).padStart(2, '0')}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--adm-accent, #0f7a45)', fontSize: '0.87rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.objetivu}
                      </div>
                    </td>
                    <td style={{ color: 'var(--adm-text-secondary)', fontSize: '0.85rem', maxWidth: 220 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{item.atividade}</div>
                    </td>
                    <td style={{ color: '#856b00', fontSize: '0.85rem', maxWidth: 180 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{item.sasukat}</div>
                    </td>
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
              <div className="adm-empty-icon"><ClipboardList size={40} strokeWidth={1} /></div>
              <h3>{search ? 'La iha rezultadu buka nian' : 'Seidauk iha estratejia'}</h3>
              <p>{search ? `La hetan estratejia ho "${search}".` : 'Aumenta objetivu estratejiku dahuluk.'}</p>
              {!search && <button className="adm-btn adm-btn-primary" onClick={() => { setModalError(''); setModal({ item: null, nextOrder: 1 }) }}><PlusCircle size={15} />Aumenta Estratejia</button>}
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
            <p>Ita boot hakarak delete objetivu estratejiku: <strong>"{deleteTarget.objetivu}"</strong>?</p>
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
