import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Tag, Newspaper, ChevronRight } from 'lucide-react'
import OptimizedImage from '../../components/base/OptimizedImage'
import { resolveMediaSrc } from '../../utils/media'

const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=1400&q=80'

const formatDate = (dateValue) => {
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function NewsDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [news, setNews] = useState(null)
  const [related, setRelated] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    setError('')
    setNews(null)
    setRelated([])

    Promise.all([
      fetch(`/api/content/news/${id}/`).then((r) => {
        if (!r.ok) throw new Error("Notísia ne'ebé ita buka la hetan.")
        return r.json()
      }),
      fetch(`/api/content/news/?related_for=${encodeURIComponent(id)}&limit=3&compact=1`).then((r) => {
        if (!r.ok) throw new Error('Falha karga notísias relasionadu.')
        return r.json()
      }),
    ])
      .then(([detail, rel]) => {
        setNews(detail.news)
        setRelated(rel.news || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [id])

  const hero = resolveMediaSrc(news?.image_url) || FALLBACK_HERO

  if (isLoading) {
    return (
      <div className="nwd-loading">
        <div className="nwd-spinner" />
        <p>Karga notísia...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="nwd-error-state">
        <Newspaper size={52} strokeWidth={1} />
        <h2>Notísia la hetan</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate('/news')}>
          <ArrowLeft size={15} /> Fila ba Notísias
        </button>
      </div>
    )
  }

  return (
    <>
      {/* ── Hero ── */}
      <div className="nwd-hero" style={{ backgroundImage: `url(${hero})` }}>
        <div className="nwd-hero-overlay" />
        <div className="container nwd-hero-inner">
          {/* Breadcrumb */}
          <nav className="nwd-breadcrumb">
            <Link to="/news">Notísias</Link>
            <ChevronRight size={13} />
            <span>{news?.title}</span>
          </nav>
          <h1 className="nwd-hero-title">{news?.title}</h1>
          <div className="nwd-hero-meta">
            {formatDate(news?.published_at) && (
              <span className="nwd-meta-chip">
                <Calendar size={13} strokeWidth={2} />
                {formatDate(news?.published_at)}
              </span>
            )}
            {news?.tags?.map((t) => (
              <Link
                key={t}
                to={`/news?tag=${encodeURIComponent(t)}`}
                className="nwd-meta-chip nwd-meta-chip--tag"
              >
                <Tag size={12} strokeWidth={2} />
                {t}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Article body ── */}
      <div className="content-section">
        <div className="container nwd-layout">
          {/* Main column */}
          <article className="nwd-article">
            {news?.summary && (
              <p className="nwd-summary">{news.summary}</p>
            )}
            {news?.content ? (
              <div
                className="nwd-body rich-html"
                dangerouslySetInnerHTML={{ __html: news.content }}
              />
            ) : (
              <p className="nwd-no-content">Konteúdu ba notísia ne'e seidauk iha.</p>
            )}

            {/* Gallery */}
            {news?.gallery?.length > 0 && (
              <div className="nwd-gallery">
                <h3 className="nwd-gallery-title">Galeria</h3>
                <div className="nwd-gallery-grid">
                  {news.gallery.map((img) => (
                    <div key={img.id} className="nwd-gallery-item">
                      <OptimizedImage
                        src={resolveMediaSrc(img.image_url)}
                        alt={img.caption || 'Galeria'}
                        fallbackSrc={FALLBACK_HERO}
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, 520px"
                      />
                      {img.caption && (
                        <span className="nwd-gallery-caption">{img.caption}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {news?.tags?.length > 0 && (
              <div className="nwd-article-tags">
                <Tag size={14} strokeWidth={2} />
                {news.tags.map((t) => (
                  <Link
                    key={t}
                    to={`/news?tag=${encodeURIComponent(t)}`}
                    className="news-tag"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            )}

            <div className="nwd-back-wrap">
              <Link to="/news" className="nwd-back-btn">
                <ArrowLeft size={15} strokeWidth={2} />
                Fila ba lista notísias
              </Link>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="nwd-sidebar">
            {related.length > 0 && (
              <div className="nwd-related">
                <h3 className="nwd-sidebar-title">Notísias Seluk</h3>
                <div className="nwd-related-list">
                  {related.map((item) => (
                    <Link
                      key={item.id}
                      to={`/news/${item.id}`}
                      className="nwd-related-item"
                    >
                      <OptimizedImage
                        src={resolveMediaSrc(item.image_url) || FALLBACK_HERO}
                        alt={item.title}
                        fallbackSrc={FALLBACK_HERO}
                        loading="lazy"
                        sizes="160px"
                      />
                      <div className="nwd-related-info">
                        {formatDate(item.published_at) && (
                          <span className="nwd-related-date">
                            {formatDate(item.published_at)}
                          </span>
                        )}
                        <span className="nwd-related-title">{item.title}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}

export default NewsDetailPage
