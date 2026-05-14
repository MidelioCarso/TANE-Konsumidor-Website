import { useEffect, useState } from 'react'
import {
  BookOpen, Sprout, Handshake, Trophy, Globe, Star,
  Flame, Lightbulb, Bird, Ribbon
} from 'lucide-react'
import useHeroBackground from '../../hooks/useHeroBackground'
import { resolveMediaSrc } from '../../utils/media'
import { readProfileContentCache, writeProfileContentCache } from '../../utils/profileCache'

const HISTORY_ICONS = [
  BookOpen, Sprout, Handshake, Trophy, Globe, Star,
  Flame, Lightbulb, Bird, Ribbon
]

function HistoriaPage() {
  const cachedContent = readProfileContentCache()
  const [history, setHistory] = useState(cachedContent?.history || [])
  const [heroImage, setHeroImage] = useState(cachedContent?.profile?.historia_hero_image_url || '')
  const [isLoading, setIsLoading] = useState(() => !cachedContent)
  const [error, setError] = useState('')
  const heroImageSrc = resolveMediaSrc(heroImage)
  const { heroStyle, heroReady } = useHeroBackground(heroImageSrc)

  useEffect(() => {
    const controller = new AbortController()

    const loadHistory = async () => {
      try {
        const response = await fetch('/api/content/profile/', { signal: controller.signal })
        if (!response.ok) throw new Error('Falha atu karga istória TANE.')
        const payload = await response.json()
        setHistory(payload.history || [])
        setHeroImage(payload.profile?.historia_hero_image_url || '')
        writeProfileContentCache(payload)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    loadHistory()

    return () => {
      controller.abort()
    }
  }, [])

  return (
    <>
      {/* ── Page Hero ── */}
      <div
        className={`page-hero page-hero--tall${heroReady ? ' hero-bg-ready' : ''}`}
        style={heroStyle}
      >
        <div className="page-hero-overlay page-hero-overlay--warm" />
        <div className="container page-hero-content">
          <div className="page-hero-badge">
            <BookOpen size={14} strokeWidth={2} /> Jornada Organizasaun
          </div>
          <h1>Istória TANE</h1>
          <p>
          Kuñese no deskobre jornada, istória husi TANE Konsumidor nia ezistensia iha rai doben Timor-Leste.
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <section className="content-section">
        <div className="container">

          {isLoading ? <p>Karga istória...</p> : null}
          {error ? <p className="error-text">{error}</p> : null}

          {!isLoading && !error ? (
            <>
              <div className="section-head fade-section">
                
              </div>

              {history.length ? (
                <div className="historia-timeline fade-section">
                  {history.map((item, index) => (
                    <article key={item.id} className="historia-item">
                      <div className="historia-icon-col">
                        <div className="historia-icon">
                          {(() => { const I = HISTORY_ICONS[index % HISTORY_ICONS.length]; return <I size={28} strokeWidth={1.5} /> })()}
                        </div>
                        {index < history.length - 1 && (
                          <div className="historia-connector" />
                        )}
                      </div>
                      <div className="historia-content">
                        <h3>{item.title}</h3>
                        <div className="rich-html" dangerouslySetInnerHTML={{ __html: item.description }} />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state fade-section">
                  <div className="empty-state-icon"><BookOpen size={48} strokeWidth={1} /></div>
                  <h3>Istória seidauk aumenta</h3>
                  <p>
                    Konteúdu istória nian sei iha lalais. Torna fali mai iha
                    loron seluk.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>
    </>
  )
}

export default HistoriaPage
