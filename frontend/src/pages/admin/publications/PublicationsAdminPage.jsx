import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  PlusCircle,
  Pencil,
  Trash2,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
} from 'lucide-react'
import Pagination from '../../../components/admin/Pagination'
import { resolveMediaSrc } from '../../../utils/media'
import { useAdminAuth } from '../../../context/AdminAuthContext'

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-TL', { year: 'numeric', month: 'short', day: 'numeric' })
}

function getReviewBadge(item) {
  const status = item.review_status || (item.is_published ? 'approved' : 'draft')
  if (item.is_published) return { className: 'adm-badge--green', label: 'Publicized' }
  if (status === 'approved' || status === 'rejected') return { className: 'adm-badge--blue', label: 'Reviewed' }
  if (status === 'pending_review') return { className: 'adm-badge--amber', label: 'Pending Review' }
  return { className: 'adm-badge--gray', label: 'Draft' }
}

export default function PublicationsAdminPage() {
  const navigate = useNavigate()
  const { user } = useAdminAuth()
  const capabilities = user?.capabilities || {}
  const isSuperadmin = Boolean(user?.is_superuser || capabilities.is_superadmin)
  const canReviewPublish = isSuperadmin || Boolean(capabilities.can_review_publish)
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = (searchParams.get('status') || '').toLowerCase()
  const initialStatus = ['all', 'pending', 'reviewed', 'publicized', 'draft'].includes(statusParam)
    ? statusParam
    : 'all'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [tags, setTags] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Server-side filter state
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [tagFilter, setTagFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  const debounceRef = useRef(null)

  const flash = (msg, isError = false) => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    if (isError) {
      setError(msg)
      setTimeout(() => setError(''), 5000)
    } else {
      setSuccess(msg)
      setTimeout(() => setSuccess(''), 4000)
    }
  }

  const load = useCallback((opts = {}) => {
    const q = opts.search ?? search
    const st = opts.status ?? statusFilter
    const tg = opts.tag ?? tagFilter
    const pg = opts.page ?? page
    const pp = opts.perPage ?? perPage

    setLoading(true)
    const params = new URLSearchParams({ q, status: st, tag: tg, page: pg, per_page: pp })
    if (st === 'pending') params.set('status', 'pending_review')
    else if (st === 'reviewed') params.set('status', 'approved')
    else if (st === 'publicized') params.set('status', 'published')
    else if (st === 'draft') params.set('status', 'draft')
    else params.set('status', 'all')
    fetch(`/api/admin/publications/?${params}`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.publications || [])
        if (d.pagination) {
          setTotalPages(d.pagination.total_pages)
          setTotalItems(d.pagination.total_items)
        }
      })
      .catch(() => flash('Falha karga publikasaun.', true))
      .finally(() => setLoading(false))
  }, [search, statusFilter, tagFilter, page, perPage])

  // Load tags once
  useEffect(() => {
    fetch('/api/admin/pub-tags/', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => setTags(d.tags || []))
      .catch(() => {})
  }, [])

  // Initial + filter-driven load
  useEffect(() => { load() }, [search, statusFilter, tagFilter, page, perPage]) // eslint-disable-line

  const handleSearchInput = (val) => {
    setSearchInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      setSearch(val)
    }, 380)
  }

  const handleFilterChange = (type, val) => {
    setPage(1)
    if (type === 'status') setStatusFilter(val)
    if (type === 'tag') setTagFilter(val)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const r = await fetch(`/api/admin/publications/${deleteTarget.id}/`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!r.ok) throw new Error('Delete la susesu.')
      setDeleteTarget(null)
      load()
      flash('Publikasaun deleta ho susesu.')
    } catch (err) {
      flash(err.message, true)
    } finally {
      setDeleting(false)
    }
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setStatusFilter('all')
    setTagFilter('all')
    setPage(1)
  }

  const hasFilters = searchInput || statusFilter !== 'all' || tagFilter !== 'all'

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (statusFilter && statusFilter !== 'all') next.set('status', statusFilter)
    else next.delete('status')
    setSearchParams(next, { replace: true })
  }, [statusFilter, searchParams, setSearchParams])

  return (
    <>
      <div className="adm-topbar">
        <div className="adm-topbar-breadcrumb">
          <span>Admin</span>
          <span className="sep">/</span>
          <span className="current">Publikasaun</span>
        </div>
        <div className="adm-topbar-actions">
          <button
            className="adm-btn adm-btn-primary adm-btn-sm"
            onClick={() => navigate('/admin-panel/publications/new')}
          >
            <PlusCircle size={15} />
            {canReviewPublish ? 'Aumenta Publikasaun' : 'Submete Publikasaun'}
          </button>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">Publikasaun</h1>
            <p className="adm-page-subtitle">
              Halo jestaun dokumentu PDF no publikasaun ofisiál TANE nian.
            </p>
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

        {/* ── Toolbar ── */}
        <div className="adm-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="adm-search-bar" style={{ flex: '1 1 220px', minWidth: 180 }}>
            <Search size={16} style={{ color: '#8aab98', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buka títulu ka deskrisaun..."
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8aab98', padding: 0, display: 'flex' }}
                onClick={() => handleSearchInput('')}
                title="Hamoos"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="adm-filter-select">
            <Filter size={14} style={{ color: '#8aab98' }} />
            <select value={statusFilter} onChange={(e) => handleFilterChange('status', e.target.value)}>
              <option value="all">Hotu Status</option>
              <option value="publicized">Publicized</option>
              <option value="reviewed">Reviewed</option>
              <option value="pending">Pending Review</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          {tags.length > 0 && (
            <div className="adm-filter-select">
              <Filter size={14} style={{ color: '#8aab98' }} />
              <select value={tagFilter} onChange={(e) => handleFilterChange('tag', e.target.value)}>
                <option value="all">Hotu Tags</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {hasFilters && (
            <button className="adm-btn adm-btn-secondary adm-btn-sm" onClick={clearFilters}>
              <X size={13} /> Hamoos Filtru
            </button>
          )}

          <span style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 'auto' }}>
            {totalItems} publikasaun
          </span>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div className="adm-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : items.length ? (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th style={{ width: 48 }}>#</th>
                    <th>Títulu</th>
                    <th>Tags</th>
                    <th style={{ width: 110 }}>Data</th>
                    <th style={{ width: 90 }}>Tamanhu</th>
                    <th style={{ width: 100 }}>Status</th>
                    <th style={{ width: 100 }}>Aksaun</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const reviewBadge = getReviewBadge(item)
                    return (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--adm-text-muted)', fontWeight: 600 }}>
                        {String((page - 1) * perPage + idx + 1).padStart(2, '0')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {item.cover_image_url ? (
                            <img
                              src={resolveMediaSrc(item.cover_image_url)}
                              alt=""
                              style={{ width: 36, height: 48, objectFit: 'cover', borderRadius: 4, flexShrink: 0, background: '#edf5f0' }}
                            />
                          ) : (
                            <div style={{ width: 36, height: 48, background: '#f0f7f4', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <FileText size={18} style={{ color: '#8aab98' }} />
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--adm-text-primary)', maxWidth: 220, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                              {item.title}
                            </div>
                            {item.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', marginTop: 2, maxWidth: 220, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {item.description.replace(/<[^>]+>/g, '')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {item.tags.length ? item.tags.map((t) => (
                            <span key={t.id} style={{ background: '#e8f5ee', color: '#0f5f37', borderRadius: 12, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 600 }}>
                              {t.name}
                            </span>
                          )) : <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.8rem' }}>—</span>}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--adm-text-secondary)' }}>
                        {formatDate(item.published_at)}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--adm-text-secondary)' }}>
                        {formatFileSize(item.file_size)}
                      </td>
                      <td>
                        <span className={`adm-badge ${reviewBadge.className}`}>{reviewBadge.label}</span>
                      </td>
                      <td>
                        <div className="adm-td-actions">
                          {item.file_url && (
                            <a
                              href={resolveMediaSrc(item.file_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="adm-btn adm-btn-secondary adm-btn-sm"
                              title="Download PDF"
                            >
                              <Download size={13} />
                            </a>
                          )}
                          <button
                            className="adm-btn adm-btn-secondary adm-btn-sm"
                            onClick={() => navigate(`/admin-panel/publications/${item.id}/edit`)}
                            title={item.review_status === 'pending_review' && canReviewPublish ? 'Review' : 'Edit'}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="adm-btn adm-btn-danger adm-btn-sm"
                            onClick={() => setDeleteTarget(item)}
                            title="Delete"
                          >
                            <Trash2 size={13} />
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
              onPageChange={(p) => setPage(p)}
              perPage={perPage}
              onPerPageChange={(pp) => { setPerPage(pp); setPage(1) }}
              totalItems={totalItems}
            />
          </>
        ) : (
          <div className="adm-table-wrap">
            <div className="adm-empty">
              <div className="adm-empty-icon">
                <FileText size={40} strokeWidth={1} />
              </div>
              <h3>{hasFilters ? 'La iha rezultadu buka nian' : 'Seidauk iha publikasaun'}</h3>
              <p>
                {hasFilters
                  ? "La hetan publikasaun ho filtru ida-ne'e."
                  : 'Aumenta publikasaun PDF dahuluk.'}
              </p>
              {!hasFilters && (
                <button
                  className="adm-btn adm-btn-primary"
                  onClick={() => navigate('/admin-panel/publications/new')}
                >
                  <PlusCircle size={15} />
                  Aumenta Publikasaun
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <div className="adm-modal-overlay">
          <div className="adm-modal">
            <h3>Konfirma Delete</h3>
            <p>
              Ita boot hakarak delete publikasaun{' '}
              <strong>"{deleteTarget.title}"</strong>?
            </p>
            <p style={{ fontSize: '0.83rem', color: 'var(--adm-text-muted)', marginTop: 4 }}>
              Aksaun ida-ne'e sei hetan la bele fó fila.
            </p>
            <div className="adm-modal-actions">
              <button
                className="adm-btn adm-btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Kansela
              </button>
              <button
                className="adm-btn adm-btn-danger"
                style={{ background: '#d93025', color: '#fff', padding: '10px 20px' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deletando...' : 'Sim, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
