import { useEffect, useState } from 'react'
import { Save, AlertCircle, CheckCircle, BookOpen } from 'lucide-react'
import RichEditor from '../../components/admin/RichEditor'
import useUnsavedForm from '../../hooks/useUnsavedForm'
import AdminUnsavedNotice from '../../components/admin/AdminUnsavedNotice'

const EMPTY_FORM = {
  id: '',
  title: '',
  description: '',
  display_order: 1,
}

export default function HistoriaAdminPage() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { isDirty, isFieldDirty, resetBaseline } = useUnsavedForm(form, !loading)

  const isEdit = Boolean(form.id)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/history/', { credentials: 'same-origin' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || 'Falha karga istória.')
        return d
      })
      .then((d) => {
        const first = (d.history || [])[0]
        if (first) {
          const loaded = {
            id: first.id,
            title: first.title || '',
            description: first.description || '',
            display_order: first.display_order || 1,
          }
          setForm(loaded)
          resetBaseline(loaded)
        } else {
          setForm(EMPTY_FORM)
          resetBaseline(EMPTY_FORM)
        }
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [resetBaseline])

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const flash = (msg) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim()) {
      setError('Títulu no deskrisaun obrigatóriu.')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      title: form.title,
      description: form.description,
      display_order: 1,
    }

    const url = isEdit ? `/api/admin/history/${form.id}/` : '/api/admin/history/'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const r = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Operasaun la susesu.')

      const item = d.history || payload
      const nextForm = {
        id: item.id || form.id,
        title: item.title || payload.title,
        description: item.description || payload.description,
        display_order: 1,
      }
      setForm(nextForm)
      resetBaseline(nextForm)
      flash(isEdit ? 'Istória atualiza ho susesu.' : 'Istória kria ho susesu.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="adm-topbar">
        <div className="adm-topbar-breadcrumb">
          <span>Admin</span><span className="sep">/</span><span className="current">Istória TANE</span>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">Istória Organizasaun</h1>
            <p className="adm-page-subtitle">Iha sistema ida-ne'e, istória organizasaun bele iha deit entráda ida (úniku).</p>
          </div>
        </div>

        {success && (
          <div className="adm-alert adm-alert--success">
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        {error && (
          <div className="adm-alert adm-alert--error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <AdminUnsavedNotice show={isDirty} />

        {loading ? (
          <div className="adm-loading-row">
            <div className="adm-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <form onSubmit={handleSave} noValidate>
            <div className={`adm-form-section${isDirty ? ' adm-form-section--dirty' : ''}`}>
              <div className="adm-form-section-title">
                <BookOpen size={16} strokeWidth={2} />
                {isEdit ? 'Edit Istória Úniku' : 'Kria Istória Úniku'}
              </div>

              <div className="adm-form-group">
                <label>Títulu *</label>
                <input
                  className={`adm-input${isFieldDirty('title') ? ' adm-input--dirty' : ''}`}
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Títulu istória..."
                  disabled={saving}
                />
              </div>

              <div className="adm-form-group">
                <label>Deskrisaun *</label>
                <div className={isFieldDirty('description') ? 'adm-rich-dirty-wrap' : ''}>
                  <RichEditor
                    value={form.description}
                    onChange={(html) => set('description', html)}
                    disabled={saving}
                    tall
                    placeholder="Deskrisaun detalhadu kona-ba istória organizasaun..."
                  />
                </div>
              </div>
            </div>

            <div className="adm-form-actions">
              <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
                {saving ? (
                  <>
                    <span className="adm-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Save...
                  </>
                ) : (
                  <>
                    <Save size={15} strokeWidth={2} />
                    {isEdit ? 'Atualiza Istória' : 'Kria Istória'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
