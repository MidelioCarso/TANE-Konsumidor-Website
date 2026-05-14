import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Target, Telescope, Gem, ArrowRight, Calendar } from 'lucide-react'
import useHeroBackground from '../../hooks/useHeroBackground'
import OptimizedImage from '../../components/base/OptimizedImage'
import { resolveMediaSrc } from '../../utils/media'

const FALLBACK_NEWS_THUMBNAIL =
  'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=800&q=80'

const initialData = {
  profile: {
    organization_name: 'TANE Konsumidor',
    home_hero_image_url: '',
    mision:
      'TANE Konsumidor servisu atu proteje no empodera konsumidor liu husi defeza, edukasaun, no apoiu komunidade.',
    vision: '',
    valor: '',
  },
  strategic_plan: {
    valores: [],
    stakeholders: [],
    objectives: [],
  },
  news: [],
}

const HOME_CACHE_KEY = 'tane_home_payload_v1'
const HOME_CACHE_TTL_MS = 5 * 60 * 1000

const readHomeCache = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(HOME_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.savedAt || !parsed?.data) return null
    if (Date.now() - parsed.savedAt > HOME_CACHE_TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

const writeHomeCache = (payload) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      data: payload,
    }))
  } catch {
    // ignore cache write failures
  }
}

const formatDate = (dateValue) => {
  if (!dateValue) return 'Data la dispoñível'
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return 'Data la dispoñível'
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const extractPreviewParagraph = (content = '') => {
  const clean = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  return clean
}

const extractPlainText = (content = '') => {
  if (!content) return ''
  const plain = String(content)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()

  return plain.replace(/^['"“”‘’]+|['"“”‘’]+$/g, '')
}

function HomePage() {
  const cachedHomeContent = readHomeCache()
  const [data, setData] = useState(() => cachedHomeContent || initialData)
  const [isLoading, setIsLoading] = useState(() => !cachedHomeContent)
  const [error, setError] = useState('')
  const heroImageSrc = resolveMediaSrc(data.profile.home_hero_image_url)
  const { heroStyle, heroReady } = useHeroBackground(heroImageSrc)

  useEffect(() => {
    const controller = new AbortController()

    const loadHomeContent = async () => {
      try {
        const response = await fetch('/api/content/home/', { signal: controller.signal })
        if (!response.ok) throw new Error('Falha atu karga konteúdu pájina dahuluk.')
        const payload = await response.json()
        setData(payload)
        writeHomeCache(payload)
      } catch (fetchError) {
        if (fetchError?.name === 'AbortError') return
        setError(fetchError.message)
      } finally {
        setIsLoading(false)
      }
    }
    loadHomeContent()

    return () => {
      controller.abort()
    }
  }, [])

  const recentNews = useMemo(() => {
    const items = [...(data.news || [])]
    return items.sort((firstItem, secondItem) => {
      const firstDate = new Date(firstItem.published_at || 0).getTime()
      const secondDate = new Date(secondItem.published_at || 0).getTime()
      return secondDate - firstDate
    }).slice(0, 5)
  }, [data.news])

  return (
    <>
      {/* ── HERO with background image ── */}
      <section
        className={`hero-banner hero-banner--visible${heroReady ? ' hero-bg-ready' : ''}`}
        style={heroStyle}
      >
        <div className="hero-overlay" />
        <div className="container hero-inner">
          <span className="hero-tag">ADVOCACIA DOS CONSUMIDORES</span>
          <h1>Direitu Konsumidor nian Importante</h1>
          <p className="hero-lead">{extractPlainText(data.profile.mision) || 'Misaun seidauk aumenta.'}</p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-lg" to="/about/perfil">
              Perfil TANE
            </Link>
            <Link className="btn btn-outline-light btn-lg" to="/work">
              Notísias
            </Link>
          </div>
        </div>
      </section>

      {/* ── profile highlights ── */}
      <section className="content-section">
        <div className="container">
          <div className="section-head section-head-center">
            <h2>Perfil TANE Konsumidor</h2>
            <p>Misaun, Vizaun no Valor TANE Konsumidor.</p>
          </div>
          {isLoading ? <p>Karga perfil...</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
          {!isLoading && !error ? (
            <div className="card-grid">
              <article className="info-card card-hover">
                <div className="card-icon"><Target size={28} strokeWidth={1.5} /></div>
                <h3>Misaun</h3>
                <div className="rich-html" dangerouslySetInnerHTML={{ __html: data.profile.mision || 'Misaun seidauk aumenta.' }} />
              </article>
              <article className="info-card card-hover">
                <div className="card-icon"><Telescope size={28} strokeWidth={1.5} /></div>
                <h3>Vizaun</h3>
                <div className="rich-html" dangerouslySetInnerHTML={{ __html: data.profile.vision || 'Vizaun seidauk aumenta.' }} />
              </article>
              <article className="info-card card-hover">
                <div className="card-icon"><Gem size={28} strokeWidth={1.5} /></div>
                <h3>Valor</h3>
                <div className="rich-html" dangerouslySetInnerHTML={{ __html: data.profile.valor || 'Valor seidauk aumenta.' }} />
              </article>
            </div>
          ) : null}
        </div>
      </section>

      {/* ── recent news ── */}
      <section className="content-section content-section-alt">
        <div className="container">
          <div className="section-head news-section-head">
            <div>
              <h2>Notísia Foun</h2>
              <p>Notísia ba atividade no programa husi TANE Konsumidor Timor-Leste.</p>
            </div>
            <Link to="/work" className="btn btn-secondary news-all-btn">
              Haree Notísias Seluk
              <ArrowRight size={16} strokeWidth={2.2} />
            </Link>
          </div>
          {!isLoading && !error ? (
            <div className="news-list">
              {recentNews.length ? (
                recentNews.map((newsItem) => (
                  <Link key={newsItem.id} to={`/news/${newsItem.id}`} className="news-item news-item--link">
                    <div className="news-thumb-wrap">
                      <OptimizedImage
                        src={resolveMediaSrc(newsItem.image_url) || FALLBACK_NEWS_THUMBNAIL}
                        alt={newsItem.title}
                        fallbackSrc={FALLBACK_NEWS_THUMBNAIL}
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, 280px"
                      />
                    </div>
                    <div className="news-content">
                      <div className="news-meta">
                        {formatDate(newsItem.published_at) && (
                          <span className="news-date">
                            <Calendar size={12} strokeWidth={2} style={{ marginRight: 4 }} />
                            {formatDate(newsItem.published_at)}
                          </span>
                        )}
                        {newsItem.tags?.length > 0 && (
                          <span className="news-tag">{newsItem.tags[0]}</span>
                        )}
                      </div>
                      <h3>{newsItem.title}</h3>
                      <p>{newsItem.summary}</p>
                      <span className="news-read-more">
                        Lee Mais <ArrowRight size={13} strokeWidth={2.2} />
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p>La iha notísia seidauk.</p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="content-section cta-section">
        <div className="container cta-panel">
          <h2>Hatene Liu Tan Kona-ba TANE Konsumidor Timor-Leste</h2>
          <p>
            Mai Hatene Liu Tan Kona-ba TANE Konsumidor nia Perfil, Misaun, Vizaun, no Valor.
          </p>
          <Link className="btn btn-primary btn-lg" to="/about">
            Kona-ba TANE
          </Link>
        </div>
      </section>
    </>
  )
}

export default HomePage