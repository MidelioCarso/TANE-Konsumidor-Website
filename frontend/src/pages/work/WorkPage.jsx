import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Tag, ArrowRight, Newspaper, Search, X } from 'lucide-react'
import OptimizedImage from '../../components/base/OptimizedImage'
import { resolveMediaSrc } from '../../utils/media'

const FALLBACK_NEWS_THUMBNAIL =
  'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=800&q=80'

const formatDate = (dateValue) => {
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const stripHtml = (html = '') =>
  html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

function NewsCard({ item, featured = false }) {
  const thumb = resolveMediaSrc(item.image_url) || FALLBACK_NEWS_THUMBNAIL
  const excerpt = stripHtml(item.content).slice(0, 160) || item.summary

  if (featured) {
    return (
      <Link to={`/news/${item.id}`} className="nwl-featured-card">
        <div className="nwl-featured-img">
          <OptimizedImage
            src={thumb}
            alt={item.title}
            fallbackSrc={FALLBACK_NEWS_THUMBNAIL}
            loading="eager"
            sizes="100vw"
          />
          <div className="nwl-featured-overlay" />
          <div className="nwl-featured-body">
            {item.tags?.length > 0 && (
              <span className="nwl-tag-pill">{item.tags[0]}</span>
            )}
            <h2 className="nwl-featured-title">{item.title}</h2>
            <p className="nwl-featured-excerpt">{item.summary || excerpt}</p>
            <div className="nwl-featured-meta">
              {formatDate(item.published_at) && (
                <span className="nwl-meta-date">
                  <Calendar size={13} strokeWidth={2} />
                  {formatDate(item.published_at)}
                </span>
              )}
              <span className="nwl-read-more">
                Lee Mais <ArrowRight size={14} strokeWidth={2.2} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/news/${item.id}`} className="nwl-card">
      <div className="nwl-card-img">
        <OptimizedImage
          src={thumb}
          alt={item.title}
          fallbackSrc={FALLBACK_NEWS_THUMBNAIL}
          loading="lazy"
          sizes="(max-width: 900px) 100vw, 360px"
        />
      </div>
      <div className="nwl-card-body">
        <div className="nwl-card-meta">
          {formatDate(item.published_at) && (
            <span className="nwl-meta-date">
              <Calendar size={12} strokeWidth={2} />
              {formatDate(item.published_at)}
            </span>
          )}
          {item.tags?.length > 0 && (
            <span className="nwl-tag-pill nwl-tag-pill--sm">{item.tags[0]}</span>
          )}
        </div>
        <h3 className="nwl-card-title">{item.title}</h3>
        <p className="nwl-card-excerpt">{excerpt}</p>
        <span className="nwl-card-cta">
          Lee Mais <ArrowRight size={13} strokeWidth={2.2} />
        </span>
      </div>
    </Link>
  )
}

function WorkPage() {
  const [news, setNews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/content/news/')
      .then((r) => r.json())
      .then((d) => setNews(d.news || []))
      .catch(() => setError('Falha atu karga notísia sira.'))
      .finally(() => setIsLoading(false))
  }, [])

  const allTags = useMemo(() => {
    const set = new Set()
    news.forEach((n) => n.tags?.forEach((t) => set.add(t)))
    return [...set]
  }, [news])

  const filtered = useMemo(() => {
    let list = news
    if (activeTag) list = list.filter((n) => n.tags?.includes(activeTag))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.summary?.toLowerCase().includes(q) ||
          stripHtml(n.content).toLowerCase().includes(q),
      )
    }
    return list
  }, [news, activeTag, search])

  const featured = filtered[0]
  const rest = filtered.slice(1)

  return (
    <>
      {/* ── Page Hero bar ── */}
      <div className="nwl-hero">
        <div className="container nwl-hero-inner">
          <div className="nwl-hero-text">
            <div className="page-hero-badge" style={{ marginBottom: 14 }}>
              <Newspaper size={13} strokeWidth={2} /> Notísias TANE
            </div>
            <h1>Notísias &amp; Atividade</h1>
            <p>
              Atualizasaun kona-ba atividade no movimentu importante
              ne'ebé TANE halo iha Timor-Leste.
            </p>
          </div>
          {/* Search */}
          <div className="nwl-search-wrap">
            <Search size={16} className="nwl-search-icon" />
            <input
              className="nwl-search-input"
              placeholder="Buka notísia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="nwl-search-clear" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="content-section">
        <div className="container">
          {/* Tag filter bar */}
          {allTags.length > 0 && (
            <div className="nwl-tag-bar">
              <Tag size={14} strokeWidth={2} className="nwl-tag-bar-icon" />
              <button
                className={`nwl-tag-btn${activeTag === '' ? ' active' : ''}`}
                onClick={() => setActiveTag('')}
              >
                Hotu
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  className={`nwl-tag-btn${activeTag === t ? ' active' : ''}`}
                  onClick={() => setActiveTag(activeTag === t ? '' : t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="nwl-skeleton-grid">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="nwl-skeleton" />
              ))}
            </div>
          )}

          {error && <p className="error-text">{error}</p>}

          {!isLoading && !error && filtered.length === 0 && (
            <div className="nwl-empty">
              <Newspaper size={48} strokeWidth={1} />
              <h3>La iha notísia ne'ebé kombina</h3>
              <p>Tenta halo filtra seluk ka limpeza buka.</p>
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <>
              {/* Featured */}
              <NewsCard item={featured} featured />

              {/* Grid */}
              {rest.length > 0 && (
                <div className="nwl-grid">
                  {rest.map((item) => (
                    <NewsCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default WorkPage
