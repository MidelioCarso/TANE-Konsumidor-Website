import { useEffect, useRef, useState } from 'react'
import {
  FileText,
  Search,
  X,
  Download,
  Tag,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import OptimizedImage from '../../components/base/OptimizedImage'
import { resolveMediaSrc } from '../../utils/media'

const PUBLICATIONS_CACHE_KEY = 'tane_publications_payload_v1'
const PUBLICATIONS_CACHE_TTL_MS = 5 * 60 * 1000

const readPublicationsCache = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PUBLICATIONS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.savedAt || !parsed?.data) return null
    if (Date.now() - parsed.savedAt > PUBLICATIONS_CACHE_TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

const writePublicationsCache = (payload) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PUBLICATIONS_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      data: payload,
    }))
  } catch {
    // ignore cache write failures
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('pt-TL', { year: 'numeric', month: 'long', day: 'numeric' })
}

function buildPaginationItems(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages]
  }

  if (page >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, '...', page - 1, page, page + 1, '...', totalPages]
}

function PubCard({ pub }) {
  const coverSrc = pub.cover_image_url ? resolveMediaSrc(pub.cover_image_url) : null
  const fileSrc = pub.file_url ? resolveMediaSrc(pub.file_url) : null
  const size = formatFileSize(pub.file_size)

  return (
    <div className="pub-card">
      <div className="pub-card-cover">
        {coverSrc ? (
          <OptimizedImage
            src={coverSrc}
            alt={pub.title}
            className="pub-card-cover-img"
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 320px"
          />
        ) : (
          <div className="pub-card-cover-empty">
            <FileText size={40} strokeWidth={1} style={{ color: '#8aab98' }} />
          </div>
        )}
        {pub.tags.length > 0 && (
          <div className="pub-card-tags">
            {pub.tags.slice(0, 2).map((t) => (
              <span key={t.id} className="pub-card-tag">{t.name}</span>
            ))}
            {pub.tags.length > 2 && (
              <span className="pub-card-tag pub-card-tag--more">+{pub.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>

      <div className="pub-card-body">
        <h3 className="pub-card-title">{pub.title}</h3>
        {pub.description && (
          <p className="pub-card-desc">
            {pub.description.replace(/<[^>]+>/g, '').slice(0, 120)}
            {pub.description.replace(/<[^>]+>/g, '').length > 120 ? '…' : ''}
          </p>
        )}
        <div className="pub-card-meta">
          {pub.published_at && <span>{formatDate(pub.published_at)}</span>}
          {size && (
            <span className="pub-card-size">
              <FileText size={12} />
              {size}
            </span>
          )}
        </div>
      </div>

      <div className="pub-card-footer">
        {fileSrc ? (
          <a
            href={fileSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="pub-download-btn"
            download
          >
            <Download size={16} />
            Download PDF
          </a>
        ) : (
          <span className="pub-no-file">Ficheiru la disponível</span>
        )}
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, onPageChange, loading }) {
  if (totalPages <= 1) return null
  const pages = buildPaginationItems(page, totalPages)

  return (
    <div className="pub-pagination">
      <button
        className="pub-page-btn"
        onClick={() => onPageChange(1)}
        disabled={page <= 1 || loading}
        aria-label="Pájina dahuluk"
      >
        <ChevronsLeft size={16} />
      </button>
      <button
        className="pub-page-btn"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1 || loading}
        aria-label="Pájina anterior"
      >
        <ChevronLeft size={18} />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="pub-page-gap">…</span>
        ) : (
          <button
            key={p}
            className={`pub-page-btn${p === page ? ' active' : ''}`}
            onClick={() => onPageChange(p)}
            disabled={loading}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        ),
      )}
      <button
        className="pub-page-btn"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages || loading}
        aria-label="Pájina tuir mai"
      >
        <ChevronRight size={18} />
      </button>
      <button
        className="pub-page-btn"
        onClick={() => onPageChange(totalPages)}
        disabled={page >= totalPages || loading}
        aria-label="Pájina ikus"
      >
        <ChevronsRight size={16} />
      </button>
    </div>
  )
}

export default function PublicationsPage() {
  const cachedPublications = readPublicationsCache()
  const [pubs, setPubs] = useState(cachedPublications?.publications || [])
  const [tags, setTags] = useState(cachedPublications?.tags || [])
  const [heroImageUrl, setHeroImageUrl] = useState(cachedPublications?.hero_image_url || '')
  const [loading, setLoading] = useState(() => !cachedPublications)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(12)
  const [pagination, setPagination] = useState({ total_items: 0, total_pages: 1 })
  const debounceRef = useRef(null)
  const topRef = useRef(null)
  const fetchAbortRef = useRef(null)

  const fetchPubs = () => {
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort()
    }
    const controller = new AbortController()
    fetchAbortRef.current = controller

    setLoading(true)
    setError('')

    const params = new URLSearchParams({
      q: search,
      tag: activeTag,
      page: String(page),
      per_page: String(perPage),
    })

    fetch(`/api/content/publications/?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        setPubs(d.publications || [])
        setHeroImageUrl(d.hero_image_url || '')
        const nextPagination = d.pagination || { total_items: 0, total_pages: 1 }
        const nextTotalPages = Number(nextPagination.total_pages || 1)
        setPagination(nextPagination)
        if (d.tags?.length) setTags(d.tags)

        if (!search && !activeTag && page === 1 && perPage === 12) {
          writePublicationsCache(d)
        }

        if (page > nextTotalPages && nextTotalPages > 0) {
          setPage(nextTotalPages)
        }
      })
      .catch((fetchError) => {
        if (fetchError?.name === 'AbortError') return
        setError('La konsege karrega publikasaun sira. Favor prova fali.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })
  }

  useEffect(() => {
    fetchPubs()
    return () => {
      if (fetchAbortRef.current) {
        fetchAbortRef.current.abort()
      }
    }
  }, [search, activeTag, page, perPage]) // eslint-disable-line

  const handleSearchChange = (val) => {
    setSearchInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      setSearch(val)
    }, 380)
  }

  const handleTagClick = (tagId) => {
    const next = activeTag === tagId ? '' : tagId
    setActiveTag(next)
    setPage(1)
  }

  const handlePageChange = (p) => {
    if (p < 1 || p > pagination.total_pages || p === page) return
    setPage(p)
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const clearSearch = () => { setSearchInput(''); setSearch(''); setPage(1) }

  const handlePerPageChange = (event) => {
    const next = Number(event.target.value || 12)
    setPerPage(next)
    setPage(1)
  }

  return (
    <div className="pub-page" ref={topRef}>
      {/* ── Hero ── */}
      <section className="pub-hero">
        <div
          className="pub-hero-bg"
          style={{ backgroundImage: `url(${resolveMediaSrc(heroImageUrl) || ''})` }}
          aria-hidden="true"
        />
        <div className="pub-hero-overlay" aria-hidden="true" />
        <div className="pub-hero-content">
          <div className="pub-hero-icon">
            <BookOpen size={36} strokeWidth={1.5} />
          </div>
          <h1 className="pub-hero-title">Publikasaun</h1>
          <p className="pub-hero-sub">
            Dokumentu, relatóriu no publikasaun ofisiál TANE nian.
            Download livre ba públiku.
          </p>

          {/* Search bar inside hero */}
          <div className="pub-hero-search">
            <Search size={20} className="pub-search-icon" />
            <input
              type="text"
              className="pub-search-input"
              placeholder="Buka publikasaun..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchInput && (
              <button className="pub-search-clear" onClick={clearSearch} aria-label="Hamoos buka">
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Tag filters ── */}
      {tags.length > 0 && (
        <section className="pub-filter-bar">
          <div className="pub-filter-inner">
            <span className="pub-filter-label">
              <Tag size={14} />
              Filtru:
            </span>
            <button
              className={`pub-filter-tag${!activeTag ? ' active' : ''}`}
              onClick={() => handleTagClick('')}
            >
              All
            </button>
            {tags.map((t) => (
              <button
                key={t.id}
                className={`pub-filter-tag${activeTag === t.id ? ' active' : ''}`}
                onClick={() => handleTagClick(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Main content ── */}
      <section className="pub-main">
        <div className="pub-main-inner">
          {/* Results header */}
          <div className="pub-results-bar">
            <span className="pub-results-count">
              {loading ? 'Karga...' : `${pagination.total_items} publikasaun`}
              {search && ` ba "${search}"`}
              {activeTag && tags.find((t) => t.id === activeTag) && ` iha "${tags.find((t) => t.id === activeTag).name}"`}
            </span>
            <div className="pub-results-tools">
              <label className="pub-per-page-wrap">
                <span>Preview :</span>
                <select
                  className="pub-per-page-select"
                  value={perPage}
                  onChange={handlePerPageChange}
                >
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                </select>
              </label>

              {(search || activeTag) && (
                <button
                  className="pub-clear-all"
                  onClick={() => {
                    clearSearch()
                    setActiveTag('')
                    setPage(1)
                  }}
                >
                  <X size={13} />
                  Clear Filtru
                </button>
              )}
            </div>
          </div>

          {pagination.total_pages > 1 && !loading && (
            <div className="pub-page-summary">
              Pájina {page} husi {pagination.total_pages}
            </div>
          )}

          {error && (
            <div className="pub-fetch-error" role="alert">
              {error}
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="pub-loading">
              <div className="adm-spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
            </div>
          ) : pubs.length > 0 ? (
            <div className="pub-grid">
              {pubs.map((p) => (
                <PubCard key={p.id} pub={p} />
              ))}
            </div>
          ) : (
            <div className="pub-empty">
              <FileText size={56} strokeWidth={0.8} style={{ color: '#b0ccc0' }} />
              <h3>La iha publikasaun</h3>
              <p>
                {search || activeTag
                  ? "La hetan publikasaun ba buka/filtru ida-ne'e. Favor prova buka seluk."
                  : 'Seidauk iha publikasaun publikadu.'}
              </p>
              {(search || activeTag) && (
                <button
                  className="pub-filter-tag active"
                  onClick={() => { clearSearch(); setActiveTag(''); setPage(1) }}
                  style={{ marginTop: 16 }}
                >
                  View All
                </button>
              )}
            </div>
          )}

          <Pagination
            page={page}
            totalPages={pagination.total_pages}
            onPageChange={handlePageChange}
            loading={loading}
          />
        </div>
      </section>
    </div>
  )
}
