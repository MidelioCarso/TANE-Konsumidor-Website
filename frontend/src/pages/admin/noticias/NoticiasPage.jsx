import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  Newspaper,
  AlertCircle,
  CheckCircle,
  X,
  Filter,
} from 'lucide-react'
import Pagination from '../../../components/admin/Pagination'
import { resolveMediaSrc } from '../../../utils/media'
import { useAdminAuth } from '../../../context/AdminAuthContext'

const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=200&q=60'

const formatDate = (val) => {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getReviewBadge = (item) => {
  const status = item.review_status || (item.is_published ? 'approved' : 'draft')
  if (item.is_published) return { className: 'adm-badge--green', label: 'Publicized' }
  if (status === 'approved' || status === 'rejected') return { className: 'adm-badge--blue', label: 'Reviewed' }
  if (status === 'pending_review') return { className: 'adm-badge--amber', label: 'Pending Review' }
  return { className: 'adm-badge--gray', label: 'Draft' }
}

function ConfirmModal({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="adm-modal-actions">
          <button
            className="adm-btn adm-btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Kansela
          </button>
          <button
            className="adm-btn adm-btn-danger"
            style={{
              background: '#d93025',
              color: '#fff',
              padding: '10px 20px',
            }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deletando...' : 'Sim, Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NoticiasPage() {
  const { user } = useAdminAuth()
  const capabilities = user?.capabilities || {}
  const isSuperadmin = Boolean(user?.is_superuser || capabilities.is_superadmin)
  const canReviewPublish = isSuperadmin || Boolean(capabilities.can_review_publish)
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = (searchParams.get('status') || '').toLowerCase()
  const initialStatus = ['all', 'pending', 'reviewed', 'publicized', 'draft'].includes(statusParam)
    ? statusParam
    : 'all'

  const [news, setNews] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [tagFilter, setTagFilter] = useState('all')
  const [tagSearch, setTagSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [previewModalSrc, setPreviewModalSrc] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    fetch('/api/admin/tags/', { credentials: 'same-origin' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || 'Falha karga tags.')
        return d
      })
      .then((d) => setTags(d.tags || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('per_page', String(perPage))
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (statusFilter === 'pending') params.set('status', 'pending_review')
    else if (statusFilter === 'reviewed') params.set('status', 'approved')
    else if (statusFilter === 'publicized') params.set('status', 'published')
    else if (statusFilter === 'draft') params.set('status', 'draft')
    if (tagFilter !== 'all') params.set('tag', tagFilter)

    fetch(`/api/admin/news/?${params.toString()}`, { credentials: 'same-origin' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || 'Falha karga notísias.')
        return d
      })
      .then((d) => {
        const rows = d.news || []
        const meta = d.pagination || {}
        setError('')
        setNews(rows)
        setTotalItems(meta.total_items ?? rows.length)
        setTotalPages(meta.total_pages ?? 1)
        if (meta.page && meta.page !== page) {
          setPage(meta.page)
        }
      })
      .catch(() => setError('Falha karga notísias.'))
      .finally(() => setLoading(false))
  }, [page, perPage, debouncedSearch, statusFilter, tagFilter, refreshKey])

  const visibleTags = useMemo(() => {
    const q = tagSearch.trim().toLowerCase()
    if (!q) return tags
    return tags.filter((t) => t.name.toLowerCase().includes(q))
  }, [tags, tagSearch])

  // Reset to page 1 whenever filters change
  useEffect(() => setPage(1), [search, statusFilter, tagFilter, perPage])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (statusFilter && statusFilter !== 'all') next.set('status', statusFilter)
    else next.delete('status')
    setSearchParams(next, { replace: true })
  }, [statusFilter, searchParams, setSearchParams])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const r = await fetch(`/api/admin/news/${deleteTarget.id}/`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!r.ok) throw new Error('Delete la susesu.')
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      setSuccessMsg(`"${deleteTarget.title}" hetan deleta ona.`)
      setDeleteTarget(null)
      setRefreshKey((k) => k + 1)
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      {/* Topbar */}
      <div className="adm-topbar">
        <div className="adm-topbar-breadcrumb">
          <span>Admin</span>
          <span className="sep">/</span>
          <span className="current">Notísias</span>
        </div>
        <div className="adm-topbar-actions">
          <Link
            to="/admin-panel/noticias/new"
            className="adm-btn adm-btn-primary adm-btn-sm"
          >
            <PlusCircle size={15} strokeWidth={2} />
            {canReviewPublish ? 'Notisia Foun' : 'Submete Notisia'}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="adm-content">
        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">Notísias</h1>
            <p className="adm-page-subtitle">
              Halo jestaun notísias hotu-hotu iha ne'e.
            </p>
          </div>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="adm-alert adm-alert--success">
            <CheckCircle size={16} />
            {successMsg}
          </div>
        )}
        {error && (
          <div className="adm-alert adm-alert--error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="adm-toolbar">
          <div className="adm-search-bar">
            <Search size={16} style={{ color: '#8aab98', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buka titulu ka resumo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8aab98', padding: 0, display: 'flex' }}
                onClick={() => setSearch('')}
                title="Hamoos buka"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="adm-filter-select">
            <Filter size={14} style={{ color: '#8aab98' }} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Status: Hotu</option>
              <option value="publicized">Publicized</option>
              <option value="reviewed">Reviewed</option>
              <option value="pending">Pending Review</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {tags.length > 0 && (
            <div className="adm-filter-select" style={{ display: 'grid', gap: 6, minWidth: 220 }}>
              {tags.length > 12 && (
                <input
                  className="adm-input"
                  style={{ minHeight: 34, padding: '8px 10px', fontSize: '0.82rem' }}
                  placeholder="Buka tag..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                />
              )}
              <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                <option value="all">Tag: Hotu</option>
                {visibleTags.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <span style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {totalItems} rezultadu
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div className="adm-loading-row">
            <div className="adm-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : totalItems > 0 ? (
          <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ width: 52 }}>#</th>
                  <th>Títulu</th>
                  <th>Status</th>
                  <th>Tags</th>
                  <th>Data Publika</th>
                  <th style={{ width: 110 }}>Aksaun</th>
                </tr>
              </thead>
              <tbody>
                {news.map((item, idx) => {
                  const reviewBadge = getReviewBadge(item)
                  return (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--adm-text-muted)', fontWeight: 600 }}>
                      {String((page - 1) * perPage + idx + 1).padStart(2, '0')}
                    </td>
                    <td className="adm-td-title">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={resolveMediaSrc(item.thumbnail_url) || FALLBACK_THUMB}
                          alt=""
                          role="button"
                          tabIndex={0}
                          style={{
                            width: 40,
                            height: 32,
                            borderRadius: 6,
                            objectFit: 'cover',
                            flexShrink: 0,
                            cursor: 'zoom-in',
                            background: item.thumbnail_url && item.thumbnail_url.includes('/logo.png') ? '#000' : undefined,
                          }}
                          onClick={() => setPreviewModalSrc(resolveMediaSrc(item.thumbnail_url) || FALLBACK_THUMB)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setPreviewModalSrc(resolveMediaSrc(item.thumbnail_url) || FALLBACK_THUMB)
                            }
                          }}
                          onError={(e) => { e.target.src = FALLBACK_THUMB }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {item.title}
                          </div>
                          <p>{item.summary}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`adm-badge ${reviewBadge.className}`}>{reviewBadge.label}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(item.tags || []).length ? (
                          (item.tags || []).slice(0, 3).map((t) => (
                            <span
                              key={t.id}
                              className="adm-badge adm-badge--gray"
                            >
                              {t.name}
                            </span>
                          ))
                        ) : (
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--adm-text-muted)',
                            }}
                          >
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: 'var(--adm-text-secondary)', fontSize: '0.86rem' }}>
                      {formatDate(item.published_at)}
                    </td>
                    <td>
                      <div className="adm-td-actions">
                        <Link
                          to={`/admin-panel/noticias/${item.id}/edit`}
                          className="adm-btn adm-btn-secondary adm-btn-sm"
                          title={item.review_status === 'pending_review' && canReviewPublish ? 'Review' : 'Edit'}
                        >
                          <Pencil size={13} strokeWidth={2} />
                        </Link>
                        <button
                          className="adm-btn adm-btn-danger adm-btn-sm"
                          title="Delete"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            perPage={perPage}
            onPerPageChange={setPerPage}
            totalItems={totalItems}
            pageSizeOptions={[10, 20, 50, 100]}
          />
          </>
        ) : (
          <div className="adm-table-wrap">
            <div className="adm-empty">
              <div className="adm-empty-icon">
                <Newspaper size={42} strokeWidth={1} />
              </div>
              <h3>
                {(search || statusFilter !== 'all' || tagFilter !== 'all') ? 'La iha rezultadu' : 'Seidauk iha notísia'}
              </h3>
              <p>
                {(search || statusFilter !== 'all' || tagFilter !== 'all')
                  ? 'La hetan notísia ho filtru ne’ebé hili.'
                  : 'Kria notísia dahuluk hodi hahú.'}
              </p>
              {!(search || statusFilter !== 'all' || tagFilter !== 'all') && (
                <Link
                  to="/admin-panel/noticias/new"
                  className="adm-btn adm-btn-primary"
                >
                  <PlusCircle size={15} />
                  Kria Notísia Foun
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <ConfirmModal
          title="Konfirma Delete"
          message={`Ita boot hakarak delete notísia "${deleteTarget.title}"? Aksaun ne'e la bele fila fali.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

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
            <img src={previewModalSrc} alt="News thumbnail preview" />
          </div>
        </div>
      )}
    </>
  )
}
