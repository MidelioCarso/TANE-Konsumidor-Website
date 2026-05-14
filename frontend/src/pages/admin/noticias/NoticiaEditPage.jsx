import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import RichEditor from '../../../components/admin/RichEditor'
import { resolveMediaSrc } from '../../../utils/media'
import { optimizeImageForUpload } from '../../../utils/imageOptimization'
import useUnsavedForm from '../../../hooks/useUnsavedForm'
import AdminUnsavedNotice from '../../../components/admin/AdminUnsavedNotice'
import { useAdminAuth } from '../../../context/AdminAuthContext'
import {
  Save,
  ArrowLeft,
  Tag,
  X,
  Image,
  FileText,
  AlertCircle,
  CheckCircle,
  Plus,
} from 'lucide-react'

const getTodayISO = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

const normalizeDateInput = (value) => {
  if (!value) return ''
  const text = String(value).trim()
  if (!text) return ''
  if (text.includes('T')) return text.split('T')[0]
  if (text.includes(' ')) return text.split(' ')[0]
  return text.slice(0, 10)
}

const EMPTY_FORM = {
  title: '',
  summary: '',
  content: '',
  thumbnail_url: '',
  published_at: getTodayISO(),
  is_published: true,
  tag_ids: [],
}

const PLACEHOLDER_THUMB = '/logo.png'

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

export default function NoticiaEditPage() {
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
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState('')
  const [thumbnailLoadError, setThumbnailLoadError] = useState(false)
  const [thumbnailObjectUrl, setThumbnailObjectUrl] = useState('')
  const [originalPublishedAt, setOriginalPublishedAt] = useState('')
  const [previewModalSrc, setPreviewModalSrc] = useState('')
  const { user } = useAdminAuth()
  const isSuperadmin = Boolean(user?.capabilities?.is_superadmin)
  const canReviewPublish = isSuperadmin || Boolean(user?.capabilities?.can_review_publish)
  const thumbnailInputRef = useRef(null)

  const dirtySnapshot = useMemo(
    () => ({
      ...form,
      thumbnail_file_changed: Boolean(thumbnailFile),
    }),
    [form, thumbnailFile],
  )

  const { isDirty, isFieldDirty, resetBaseline } = useUnsavedForm(dirtySnapshot, !loading)

  useEffect(() => {
    return () => {
      if (thumbnailObjectUrl) {
        URL.revokeObjectURL(thumbnailObjectUrl)
      }
    }
  }, [thumbnailObjectUrl])

  // Upload an inline image inserted via the rich-text editor toolbar.
  const handleEditorImageUpload = async (file) => {
    const optimized = await optimizeImageForUpload(file, {
      maxDimension: 1800,
      targetBytes: 1.2 * 1024 * 1024,
      preferredType: 'image/webp',
    })

    const fd = new FormData()
    fd.append('image', optimized.file || file)
    const r = await fetch('/api/admin/upload-image/', {
      method: 'POST',
      credentials: 'same-origin',
      body: fd,
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || 'Image upload failed.')
    return resolveMediaSrc(d.url)
  }

  // Load tags
  useEffect(() => {
    fetch('/api/admin/tags/', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setTags(d.tags || []))
      .catch(() => {})
  }, [])

  // Load news item (edit mode)
  useEffect(() => {
    if (!isEdit) return
    fetch(`/api/admin/news/${id}/`, { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error('Notísia la hetan.')
        return r.json()
      })
      .then((d) => {
        const item = d.news
        const normalizedPublishedAt = normalizeDateInput(item.published_at)
        const loadedForm = {
          title: item.title,
          summary: item.summary,
          content: item.content,
          thumbnail_url: item.thumbnail_url,
          published_at: normalizedPublishedAt,
          is_published: item.is_published,
          tag_ids: item.tags.map((t) => t.id),
        }
        setForm(loadedForm)
        setOriginalPublishedAt(normalizedPublishedAt)
        setThumbnailPreview(resolveMediaSrc(item.thumbnail_url || ''))
        setThumbnailLoadError(false)
        resetBaseline({ ...loadedForm, thumbnail_file_changed: false })
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

  const handleThumbnailChange = async (e) => {
    const file = e.target.files?.[0] || null
    setThumbnailFile(file)
    setThumbnailLoadError(false)
    if (!file) {
      if (thumbnailObjectUrl) {
        URL.revokeObjectURL(thumbnailObjectUrl)
        setThumbnailObjectUrl('')
      }
      setThumbnailPreview(resolveMediaSrc(form.thumbnail_url || ''))
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setError('Formatu imajen la suportadu. Favor uza JPG, PNG, WEBP ka GIF.')
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = ''
      setThumbnailFile(null)
      setThumbnailPreview(resolveMediaSrc(form.thumbnail_url || ''))
      return
    }

    if (thumbnailObjectUrl) {
      URL.revokeObjectURL(thumbnailObjectUrl)
    }

    const optimized = await optimizeImageForUpload(file, {
      maxDimension: 1600,
      targetBytes: 900 * 1024,
      preferredType: 'image/webp',
    })
    const finalFile = optimized.file || file

    const objectUrl = URL.createObjectURL(finalFile)
    setThumbnailObjectUrl(objectUrl)
    setThumbnailPreview(objectUrl)
    setThumbnailFile(finalFile)
    setForm((prev) => ({ ...prev, thumbnail_url: '' }))
  }

  const handleResetThumbnail = () => {
    if (thumbnailObjectUrl) {
      URL.revokeObjectURL(thumbnailObjectUrl)
      setThumbnailObjectUrl('')
    }
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = ''
    }
    setThumbnailFile(null)
    setThumbnailLoadError(false)
    setForm((prev) => ({ ...prev, thumbnail_url: PLACEHOLDER_THUMB }))
    setThumbnailPreview(resolveMediaSrc(PLACEHOLDER_THUMB))
  }

  const openPreviewModal = () => {
    if (!thumbnailPreview || thumbnailLoadError) return
    setPreviewModalSrc(thumbnailPreview)
  }

  const handleAddTag = async () => {
    const name = newTag.trim()
    if (!name) return
    setTagLoading(true)
    try {
      const r = await fetch('/api/admin/tags/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Falha kria tag.')
      setTags((prev) =>
        prev.find((t) => t.id === d.tag.id) ? prev : [...prev, d.tag],
      )
      setForm((prev) => ({ ...prev, tag_ids: [...prev.tag_ids, d.tag.id] }))
      setNewTag('')
    } catch (err) {
      setError(err.message)
    } finally {
      setTagLoading(false)
    }
  }

  const handleDeleteTag = async (tagId, tagName) => {
    const confirmed = window.confirm(`Hakarak delete tag "${tagName}"?`)
    if (!confirmed) return

    setTagLoading(true)
    try {
      const r = await fetch(`/api/admin/tags/${tagId}/`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'Falha delete tag.')

      setTags((prev) => prev.filter((tag) => tag.id !== tagId))
      setForm((prev) => ({
        ...prev,
        tag_ids: prev.tag_ids.filter((id) => id !== tagId),
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setTagLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Títulu obrigatóriu.')
      return
    }
    if (!form.summary.trim()) {
      setError('Resumo obrigatóriu.')
      return
    }

    setSaving(true)
    setError('')

    const normalizedPublishedAt = normalizeDateInput(form.published_at) || originalPublishedAt || getTodayISO()
    const publishForPayload = canReviewPublish ? form.is_published : false
    const selectedFile = thumbnailInputRef.current?.files?.[0] || thumbnailFile
    const hasThumbnailUpload = Boolean(selectedFile)

    let payload
    let headers
    if (hasThumbnailUpload) {
      payload = new FormData()
      payload.append('title', form.title)
      payload.append('summary', form.summary)
      payload.append('content', form.content || '')
      payload.append('published_at', normalizedPublishedAt)
      payload.append('is_published', publishForPayload ? 'true' : 'false')
      payload.append('thumbnail_url', form.thumbnail_url || '')
      form.tag_ids.forEach((tagId) => payload.append('tag_ids', String(tagId)))
      payload.append('thumbnail_file', selectedFile)
    } else {
      payload = JSON.stringify({
        title: form.title,
        summary: form.summary,
        content: form.content || '',
        thumbnail_url: form.thumbnail_url || '',
        published_at: normalizedPublishedAt,
        is_published: publishForPayload,
        tag_ids: form.tag_ids,
      })
      headers = { 'Content-Type': 'application/json' }
    }

    try {
      const url = isEdit
        ? `/api/admin/news/${id}/`
        : '/api/admin/news/'
      const method = isEdit
        ? (hasThumbnailUpload ? 'POST' : 'PUT')
        : 'POST'

      const r = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers,
        body: payload,
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Operasaun la susesu.')

      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }

      const savedForm = {
        title: d.news?.title ?? form.title,
        summary: d.news?.summary ?? form.summary,
        content: d.news?.content ?? form.content,
        thumbnail_url: d.news?.thumbnail_url ?? form.thumbnail_url,
        published_at: normalizeDateInput(d.news?.published_at) || normalizedPublishedAt,
        is_published: d.news?.is_published ?? form.is_published,
        tag_ids: (d.news?.tags || []).map((t) => t.id),
      }
      resetBaseline({ ...savedForm, thumbnail_file_changed: false })

      setSuccess(
        isEdit
          ? 'Notísia atualiza ho susesu!'
          : 'Notísia kria ho susesu!',
      )
      setTimeout(() => {
        navigate('/admin-panel/noticias')
      }, 1200)
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
            <span>Admin</span>
            <span className="sep">/</span>
            <span>Notísias</span>
            <span className="sep">/</span>
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
      {/* Topbar */}
      <div className="adm-topbar">
        <div className="adm-topbar-breadcrumb">
          <span>Admin</span>
          <span className="sep">/</span>
          <span>Notísias</span>
          <span className="sep">/</span>
          <span className="current">{isEdit ? 'Edit' : 'Nova'}</span>
        </div>
        <div className="adm-topbar-actions">
          <button
            type="button"
            className="adm-btn adm-btn-secondary adm-btn-sm"
            onClick={() => navigate('/admin-panel/noticias')}
          >
            <ArrowLeft size={14} />
            Fila Fali
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="adm-content">
        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">
              {isEdit ? 'Edit Notísia' : 'Notisia Foun'}
            </h1>
            <p className="adm-page-subtitle">
              {isEdit
                ? 'Atualiza informasaun notísia iha kraik.'
                : 'Preenxe formuláriu hodi kria notísia foun.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="adm-alert adm-alert--error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="adm-alert adm-alert--success">
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        <AdminUnsavedNotice show={isDirty} />

        <form onSubmit={handleSubmit} noValidate>
          {/* ── Core info ── */}
          <div className={`adm-form-section${isDirty ? ' adm-form-section--dirty' : ''}`}>
            <div className="adm-form-section-title">
              <FileText size={16} strokeWidth={2} />
              Informasaun Báziku
            </div>

            <div className="adm-form-group">
              <label>Títulu *</label>
              <input
                className={`adm-input${isFieldDirty('title') ? ' adm-input--dirty' : ''}`}
                placeholder="Hakerek títulu notísia..."
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="adm-form-group">
              <label>Resumo *</label>
              <input
                className={`adm-input${isFieldDirty('summary') ? ' adm-input--dirty' : ''}`}
                placeholder="Resumo badak (máx 255 karakter)..."
                maxLength={255}
                value={form.summary}
                onChange={(e) => set('summary', e.target.value)}
                disabled={saving}
              />
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--adm-text-muted)',
                  float: 'right',
                  marginTop: 4,
                }}
              >
                {form.summary.length}/255
              </span>
            </div>

            <div className="adm-form-group">
              <label>Konteúdu Kompletu</label>
              <div className={isFieldDirty('content') ? 'adm-rich-dirty-wrap' : ''}>
                <RichEditor
                  value={form.content}
                  onChange={(html) => set('content', html)}
                  disabled={saving}
                  tall
                  placeholder="Hakerek konteúdu kompletu notísia iha ne'e..."
                  onImageUpload={handleEditorImageUpload}
                />
              </div>
            </div>
          </div>

          {/* ── Media & date ── */}
          <div className={`adm-form-section${isDirty ? ' adm-form-section--dirty' : ''}`}>
            <div className="adm-form-section-title">
              <Image size={16} strokeWidth={2} />
              Média no Dadus Publika
            </div>

            <div className="adm-form-row">
              <div className="adm-form-group">
                  <label>Upload Imajen Thumbnail</label>
                <input
                  ref={thumbnailInputRef}
                  className={`adm-input${isFieldDirty('thumbnail_file_changed') ? ' adm-input--dirty' : ''}`}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.gif"
                    onChange={handleThumbnailChange}
                  disabled={saving}
                />
                  <small style={{ color: 'var(--adm-text-muted)', fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                    Kompatível ho JPG, PNG, WEBP no GIF. Taman saida deit bele; preview adapta automátiku.
                  </small>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="adm-btn adm-btn-secondary adm-btn-sm"
                      onClick={handleResetThumbnail}
                      disabled={saving}
                    >
                      Reset ba Placeholder
                    </button>
                    <button
                      type="button"
                      className="adm-btn adm-btn-secondary adm-btn-sm"
                      onClick={openPreviewModal}
                      disabled={!thumbnailPreview || thumbnailLoadError}
                    >
                      Preview Imajen
                    </button>
                  </div>
                  {thumbnailPreview && !thumbnailLoadError && (
                  <div
                    className={`adm-thumb-preview${thumbnailPreview.includes('/logo.png') ? ' adm-thumb-preview--placeholder' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={openPreviewModal}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openPreviewModal()
                      }
                    }}
                  >
                    <img
                        src={thumbnailPreview}
                      alt="preview"
                      onLoad={() => setThumbnailLoadError(false)}
                      onError={(e) => {
                        setThumbnailLoadError(true)
                      }}
                    />
                  </div>
                )}
                {thumbnailLoadError && (
                  <div className="adm-thumb-preview adm-thumb-preview--empty">
                    <Image size={20} />
                    <span>Preview la disponivel ba ficheiru ida-ne'e.</span>
                  </div>
                )}
              </div>

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
            </div>

            <div className={isFieldDirty('is_published') ? 'adm-toggle-row--dirty' : ''}>
              <Toggle
                checked={form.is_published}
                onChange={(e) => canReviewPublish && set('is_published', e.target.checked)}
                label={canReviewPublish ? 'Publika ba públiku' : 'Submete ba officer/moderador review'}
                hint={
                  canReviewPublish
                    ? (form.is_published
                      ? "Notísia ne'e visível ba ema hotu."
                      : "Notísia ne'e hanesan draft, la visível.")
                    : "Labele publika direta. Officer/moderador ka super admin tenki aprova antes."
                }
              />
            </div>
          </div>

          {/* ── Tags ── */}
          <div className={`adm-form-section${isDirty || isFieldDirty('tag_ids') ? ' adm-form-section--dirty' : ''}`}>
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

            {/* Create new tag inline */}
            <div
              style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}
            >
              <input
                className={`adm-input${isFieldDirty('tag_ids') ? ' adm-input--dirty' : ''}`}
                style={{ maxWidth: 240 }}
                placeholder="Tag foun..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
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

          {/* ── Actions ── */}
          <div className="adm-form-actions">
            <button
              type="button"
              className="adm-btn adm-btn-secondary"
              onClick={() => navigate('/admin-panel/noticias')}
              disabled={saving}
            >
              Kansela
            </button>
            <button
              type="submit"
              className="adm-btn adm-btn-primary"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span
                    className="adm-spinner"
                    style={{ width: 16, height: 16, borderWidth: 2 }}
                  />
                  Save...
                </>
              ) : (
                <>
                  <Save size={15} strokeWidth={2} />
                  {isEdit ? 'Atualiza Notísia' : 'Kria Notísia'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {previewModalSrc && (
        <div className="adm-modal-overlay" onClick={() => setPreviewModalSrc('')}>
          <div className="adm-image-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="adm-image-modal-close"
              onClick={() => setPreviewModalSrc('')}
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
            <img src={previewModalSrc} alt="Thumbnail preview" />
          </div>
        </div>
      )}
    </>
  )
}
