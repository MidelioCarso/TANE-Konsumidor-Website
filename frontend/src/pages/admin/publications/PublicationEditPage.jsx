import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Save,
  ArrowLeft,
  Tag,
  X,
  FileText,
  Image,
  AlertCircle,
  CheckCircle,
  Plus,
  Download,
  RotateCcw,
  Calendar,
} from 'lucide-react'
import { resolveMediaSrc } from '../../../utils/media'
import { optimizeImageForUpload } from '../../../utils/imageOptimization'
import useUnsavedForm from '../../../hooks/useUnsavedForm'
import AdminUnsavedNotice from '../../../components/admin/AdminUnsavedNotice'
import { useAdminAuth } from '../../../context/AdminAuthContext'

const getTodayISO = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

const normDate = (v) => {
  if (!v) return ''
  const t = String(v).trim()
  if (!t) return ''
  if (t.includes('T')) return t.split('T')[0]
  if (t.includes(' ')) return t.split(' ')[0]
  return t.slice(0, 10)
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const EMPTY_FORM = {
  title: '',
  description: '',
  cover_image_url: '',
  published_at: getTodayISO(),
  is_published: true,
  display_order: 0,
  tag_ids: [],
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <div className="adm-toggle-row">
      <label className="adm-toggle">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="adm-toggle-track" />
        <span className="adm-toggle-thumb" />
      </label>
      <div>
        <div className="adm-toggle-label">{label}</div>
        {hint && <div className="adm-toggle-hint">{hint}</div>}
      </div>
    </div>
  )
}

export default function PublicationEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY_FORM)
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newTag, setNewTag] = useState('')
  const [tagLoading, setTagLoading] = useState(false)

  // PDF file state
  const [pdfFile, setPdfFile] = useState(null)
  const [existingFileUrl, setExistingFileUrl] = useState('')
  const [existingFileSize, setExistingFileSize] = useState(0)
  const pdfInputRef = useRef(null)

  // Cover image state
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [coverObjectUrl, setCoverObjectUrl] = useState('')
  const coverInputRef = useRef(null)
  const { user } = useAdminAuth()
  const isSuperadmin = Boolean(user?.capabilities?.is_superadmin)
  const canReviewPublish = isSuperadmin || Boolean(user?.capabilities?.can_review_publish)

  // Dirty state tracking
  const dirtySnapshot = useMemo(
    () => ({
      ...form,
      pdf_file_changed: Boolean(pdfFile),
      cover_file_changed: Boolean(coverFile),
    }),
    [form, pdfFile, coverFile],
  )
  const { isDirty, isFieldDirty, resetBaseline } = useUnsavedForm(dirtySnapshot, !loading)

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl)
    }
  }, [coverObjectUrl])

  // Load tags
  useEffect(() => {
    fetch('/api/admin/pub-tags/', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setTags(d.tags || []))
      .catch(() => {})
  }, [])

  // Load publication (edit mode)
  useEffect(() => {
    if (!isEdit) return
    fetch(`/api/admin/publications/${id}/`, { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error('Publikasaun la hetan.')
        return r.json()
      })
      .then((d) => {
        const p = d.publication
        const loaded = {
          title: p.title,
          description: p.description,
          cover_image_url: p.cover_image_url || '',
          published_at: normDate(p.published_at),
          is_published: p.is_published,
          display_order: p.display_order ?? 0,
          tag_ids: p.tags.map((t) => t.id),
        }
        setForm(loaded)
        setExistingFileUrl(p.file_url || '')
        setExistingFileSize(p.file_size || 0)
        setCoverPreview(p.cover_image_url ? resolveMediaSrc(p.cover_image_url) : '')
        resetBaseline({ ...loaded, pdf_file_changed: false, cover_file_changed: false })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id, isEdit, resetBaseline])

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const toggleTag = (tagId) => {
    setForm((prev) => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter((t) => t !== tagId)
        : [...prev.tag_ids, tagId],
    }))
  }

  const handlePdfChange = (e) => {
    const file = e.target.files?.[0] || null
    if (!file) { setPdfFile(null); return }
    if (file.type !== 'application/pdf') {
      setError('Favor hili ficheiru PDF deit.')
      if (pdfInputRef.current) pdfInputRef.current.value = ''
      return
    }
    setPdfFile(file)
    if (error) setError('')
  }

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0] || null
    if (!file) { setCoverFile(null); return }
    if (!file.type.startsWith('image/')) {
      setError('Favor hili ficheiru imajen deit.')
      if (coverInputRef.current) coverInputRef.current.value = ''
      return
    }
    const optimized = await optimizeImageForUpload(file, {
      maxDimension: 1800,
      targetBytes: 1.1 * 1024 * 1024,
      preferredType: 'image/webp',
    })

    const finalFile = optimized.file || file

    if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl)
    const obj = URL.createObjectURL(finalFile)
    setCoverObjectUrl(obj)
    setCoverPreview(obj)
    setCoverFile(finalFile)
    if (error) setError('')
  }

  const resetCover = () => {
    if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl)
    setCoverObjectUrl('')
    setCoverFile(null)
    setCoverPreview('')
    set('cover_image_url', '')
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  const handleAddTag = async () => {
    const name = newTag.trim()
    if (!name) return
    setTagLoading(true)
    try {
      const r = await fetch('/api/admin/pub-tags/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Falha kria tag.')
      setTags((prev) => prev.find((t) => t.id === d.tag.id) ? prev : [...prev, d.tag])
      setForm((prev) => ({ ...prev, tag_ids: [...prev.tag_ids, d.tag.id] }))
      setNewTag('')
    } catch (err) {
      setError(err.message)
    } finally {
      setTagLoading(false)
    }
  }

  const handleDeleteTag = async (tagId, tagName) => {
    if (!window.confirm(`Hakarak delete tag "${tagName}"?`)) return
    setTagLoading(true)
    try {
      const r = await fetch(`/api/admin/pub-tags/${tagId}/`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Falha delete tag.')
      setTags((prev) => prev.filter((t) => t.id !== tagId))
      setForm((prev) => ({ ...prev, tag_ids: prev.tag_ids.filter((i) => i !== tagId) }))
    } catch (err) {
      setError(err.message)
    } finally {
      setTagLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Títulu obrigatóriu.'); return }
    if (!isEdit && !pdfFile) { setError('Ficheiru PDF obrigatóriu ba publikasaun foun.'); return }
    setSaving(true); setError('')

    const body = new FormData()
    const publishForPayload = canReviewPublish ? form.is_published : false
    body.append('title', form.title)
    body.append('description', form.description || '')
    body.append('cover_image_url', form.cover_image_url || '')
    body.append('published_at', normDate(form.published_at) || getTodayISO())
    body.append('is_published', publishForPayload ? 'true' : 'false')
    body.append('display_order', String(form.display_order ?? 0))
    form.tag_ids.forEach((tid) => body.append('tag_ids', String(tid)))
    if (pdfFile) body.append('publication_file', pdfFile)
    if (coverFile) body.append('cover_image_file', coverFile)

    try {
      const url = isEdit ? `/api/admin/publications/${id}/` : '/api/admin/publications/'
      const method = 'POST'
      const r = await fetch(url, { method, credentials: 'same-origin', body })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Operasaun la susesu.')

      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })

      const p = d.publication
      const saved = {
        title: p.title,
        description: p.description,
        cover_image_url: p.cover_image_url || '',
        published_at: normDate(p.published_at),
        is_published: p.is_published,
        display_order: p.display_order ?? 0,
        tag_ids: (p.tags || []).map((t) => t.id),
      }
      setForm(saved)
      setExistingFileUrl(p.file_url || '')
      setExistingFileSize(p.file_size || 0)
      setPdfFile(null)
      setCoverFile(null)
      if (coverObjectUrl) URL.revokeObjectURL(coverObjectUrl)
      setCoverObjectUrl('')
      if (p.cover_image_url) setCoverPreview(resolveMediaSrc(p.cover_image_url))
      if (pdfInputRef.current) pdfInputRef.current.value = ''
      if (coverInputRef.current) coverInputRef.current.value = ''
      resetBaseline({ ...saved, pdf_file_changed: false, cover_file_changed: false })

      setSuccess(isEdit ? 'Publikasaun atualiza ho susesu!' : 'Publikasaun kria ho susesu!')
      setTimeout(() => navigate('/admin-panel/publications'), 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className="adm-topbar">
          <div className="adm-topbar-breadcrumb">
            <span>Admin</span><span className="sep">/</span>
            <span>Publikasaun</span><span className="sep">/</span>
            <span className="current">Edit</span>
          </div>
        </div>
        <div className="adm-content adm-fullscreen-center" style={{ minHeight: 400 }}>
          <div className="adm-spinner" />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="adm-topbar">
        <div className="adm-topbar-breadcrumb">
          <span>Admin</span><span className="sep">/</span>
          <span>Publikasaun</span><span className="sep">/</span>
          <span className="current">{isEdit ? 'Edit' : 'Nova'}</span>
        </div>
        <div className="adm-topbar-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary adm-btn-sm"
            onClick={() => navigate('/admin-panel/publications')}
          >
            <ArrowLeft size={14} />
            Fila Fali
          </button>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">{isEdit ? 'Edit Publikasaun' : 'Publikasaun Foun'}</h1>
            <p className="adm-page-subtitle">
              {isEdit ? 'Atualiza informasaun publikasaun.' : 'Aumenta dokumentu PDF foun ba públiku.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="adm-alert adm-alert--error">
            <AlertCircle size={16} />{error}
          </div>
        )}
        {success && (
          <div className="adm-alert adm-alert--success">
            <CheckCircle size={16} />{success}
          </div>
        )}

        <AdminUnsavedNotice show={isDirty} />

        <form onSubmit={handleSubmit} noValidate>
          {/* ── Core info ── */}
          <div className="adm-form-section">
            <div className="adm-form-section-title">
              <FileText size={16} strokeWidth={2} />
              Informasaun Báziku
            </div>

            <div className="adm-form-group">
              <label>Títulu *</label>
              <input
                className={`adm-input${isFieldDirty('title') ? ' adm-input--dirty' : ''}`}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Títulu publikasaun..."
                disabled={saving}
              />
            </div>

            <div className="adm-form-group">
              <label>Deskrisaun</label>
              <textarea
                className={`adm-textarea${isFieldDirty('description') ? ' adm-textarea--dirty' : ''}`}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Deskrisaun badak kona-ba publikasaun ne'e..."
                rows={4}
                disabled={saving}
              />
            </div>
          </div>

          {/* ── PDF File ── */}
          <div className="adm-form-section">
            <div className="adm-form-section-title">
              <Download size={16} strokeWidth={2} />
              Ficheiru PDF {!isEdit && <span style={{ color: '#d93025', fontSize: '0.8rem', marginLeft: 4 }}>*</span>}
            </div>

            {isEdit && existingFileUrl && !pdfFile && (
              <div className="pub-file-preview">
                <div className="pub-file-icon">
                  <FileText size={28} style={{ color: '#d93025' }} />
                </div>
                <div className="pub-file-meta">
                  <div className="pub-file-name">
                    {existingFileUrl.split('/').pop()}
                  </div>
                  {existingFileSize > 0 && (
                    <div className="pub-file-size">{formatFileSize(existingFileSize)}</div>
                  )}
                </div>
                <a
                  href={resolveMediaSrc(existingFileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="adm-btn adm-btn-secondary adm-btn-sm"
                >
                  <Download size={13} />
                  Haree PDF
                </a>
              </div>
            )}

            {pdfFile && (
              <div className="pub-file-preview pub-file-preview--new">
                <div className="pub-file-icon">
                  <FileText size={28} style={{ color: '#d93025' }} />
                </div>
                <div className="pub-file-meta">
                  <div className="pub-file-name">{pdfFile.name}</div>
                  <div className="pub-file-size">{formatFileSize(pdfFile.size)}</div>
                </div>
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary adm-btn-sm"
                  onClick={() => { setPdfFile(null); if (pdfInputRef.current) pdfInputRef.current.value = '' }}
                >
                  <RotateCcw size={13} />
                  {isEdit ? 'Uza Ficheiru Atual' : 'Fó Sai'}
                </button>
              </div>
            )}

            <div className="adm-form-group" style={{ marginTop: 12 }}>
              <label>{isEdit ? 'Troka Ficheiru PDF' : 'Upload Ficheiru PDF *'}</label>
              <input
                ref={pdfInputRef}
                className={`adm-input${isFieldDirty('pdf_file_changed') ? ' adm-input--dirty' : ''}`}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handlePdfChange}
                disabled={saving}
              />
              <small style={{ color: 'var(--adm-text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                Favor Upload File PDF deit. {isEdit ? 'Se File Publika Ona, Bele Troka Foun .' : 'Hodi Bele Publika.'}
              </small>
            </div>
          </div>

          {/* ── Cover Image ── */}
          <div className="adm-form-section">
            <div className="adm-form-section-title">
              <Image size={16} strokeWidth={2} />
              Imajen Kapa (Opsionál)
            </div>

            {coverPreview ? (
              <div className="pub-cover-wrap">
                <img src={coverPreview} alt="Cover preview" className="pub-cover-preview" />
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary adm-btn-sm"
                  onClick={resetCover}
                  disabled={saving}
                  style={{ marginTop: 8 }}
                >
                  <RotateCcw size={13} />
                  Halakon Kapa
                </button>
              </div>
            ) : (
              <div className="pub-cover-empty">
                <Image size={32} style={{ color: '#b0ccc0' }} />
                <span>La iha imajen kapa</span>
              </div>
            )}

            <div className="adm-form-group" style={{ marginTop: 12 }}>
              <label>Upload Imajen Kapa</label>
              <input
                ref={coverInputRef}
                className={`adm-input${isFieldDirty('cover_file_changed') ? ' adm-input--dirty' : ''}`}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                disabled={saving}
              />
              <small style={{ color: 'var(--adm-text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                Kompatível ho JPG, PNG, WEBP. Hatama imajen kapa atu sai iha lista publikasaun.
              </small>
            </div>
          </div>

          {/* ── Tags ── */}
          <div className="adm-form-section">
            <div className="adm-form-section-title">
              <Tag size={16} strokeWidth={2} />
              Tags
            </div>

            {tags.length > 0 && (
              <div className="adm-tags-grid" style={{ marginBottom: 16 }}>
                {tags.map((tag) => {
                  const selected = form.tag_ids.includes(tag.id)
                  return (
                    <div
                      key={tag.id}
                      className={`adm-tag-chip${selected ? ' adm-tag-chip--selected' : ''}`}
                    >
                      <button
                        type="button"
                        className="adm-tag-chip-remove"
                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                        disabled={saving || tagLoading}
                        title="Delete tag"
                        aria-label={`Delete tag ${tag.name}`}
                      >
                        <X size={12} strokeWidth={2.6} />
                      </button>
                      <button
                        type="button"
                        className="adm-tag-chip-main"
                        onClick={() => toggleTag(tag.id)}
                        disabled={saving}
                      >
                        {tag.name}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <input
                className={`adm-input${isFieldDirty('tag_ids') ? ' adm-input--dirty' : ''}`}
                style={{ maxWidth: 240 }}
                placeholder="Tag foun..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                disabled={tagLoading}
              />
              <button
                type="button"
                className="adm-btn adm-btn-secondary adm-btn-sm"
                onClick={handleAddTag}
                disabled={tagLoading || !newTag.trim()}
              >
                <Plus size={14} />
                Aumenta Tag
              </button>
            </div>
          </div>

          {/* ── Publish settings ── */}
          <div className="adm-form-section">
            <div className="adm-form-section-title">
              <Calendar size={16} strokeWidth={2} />
              Dadus Publika
            </div>

            <div className="adm-form-row">
              <div className="adm-form-group">
                <label>Data Publika</label>
                <input
                  className={`adm-input${isFieldDirty('published_at') ? ' adm-input--dirty' : ''}`}
                  type="date"
                  value={form.published_at}
                  onChange={(e) => set('published_at', e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="adm-form-group">
                <label>Ordem Hatudu</label>
                <input
                  className={`adm-input${isFieldDirty('display_order') ? ' adm-input--dirty' : ''}`}
                  type="number"
                  min="0"
                  value={form.display_order}
                  onChange={(e) => set('display_order', Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={saving}
                  style={{ maxWidth: 100 }}
                />
                <small style={{ color: 'var(--adm-text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>0 = hatudu dahuluk</small>
              </div>
            </div>

            <div className={isFieldDirty('is_published') ? 'adm-toggle-row--dirty' : ''}>
              <Toggle
                checked={form.is_published}
                onChange={(e) => canReviewPublish && set('is_published', e.target.checked)}
                label={canReviewPublish ? 'Publika ba públiku' : 'Submete ba officer/moderador review'}
                hint={canReviewPublish ? (form.is_published ? 'Visível ba ema hotu.' : 'Draft, la visível iha website.') : 'Labele publika direta. Officer/moderador ka super admin tenki aprova antes.'}
              />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="adm-form-actions">
            <button
              type="button"
              className="adm-btn adm-btn-secondary"
              onClick={() => navigate('/admin-panel/publications')}
              disabled={saving}
            >
              Kansela
            </button>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <span className="adm-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Save...
                </>
              ) : (
                <>
                  <Save size={15} strokeWidth={2} />
                  {isEdit ? 'Atualiza Publikasaun' : 'Kria Publikasaun'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
