import { useEffect, useState } from 'react'
import { Target, Telescope, Gem, Landmark } from 'lucide-react'
import useHeroBackground from '../../hooks/useHeroBackground'
import { resolveMediaSrc } from '../../utils/media'
import { readProfileContentCache, writeProfileContentCache } from '../../utils/profileCache'

const STORY_SECTIONS = [
  {
    key: 'about_intro',
    imageKey: 'about_image_url',
    Icon: Landmark,
    badge: 'Introduksaun',
    fallback: 'Introdusaun seidauk aumenta.',
  },
  {
    key: 'mision',
    imageKey: 'mision_image_url',
    Icon: Target,
    badge: 'Misaun',
    fallback: 'Misaun seidauk aumenta.',
    reverse: true,
  },
  {
    key: 'vision',
    imageKey: 'vision_image_url',
    Icon: Telescope,
    badge: 'Vizaun',
    fallback: 'Vizaun seidauk aumenta.',
  },
  {
    key: 'valor',
    imageKey: 'valor_image_url',
    Icon: Gem,
    badge: 'Valor',
    fallback: 'Valor seidauk aumenta.',
    reverse: true,
  },
]

function PerfilPage() {
  const cachedContent = readProfileContentCache()
  const [profile, setProfile] = useState(cachedContent?.profile || {
    organization_name: 'TANE Konsumidor',
    about_intro: '',
    about_image_url: '',
    mision_image_url: '',
    vision_image_url: '',
    valor_image_url: '',
    perfil_hero_image_url: '',
    mision: '',
    vision: '',
    valor: '',
  })
  const [isLoading, setIsLoading] = useState(() => !cachedContent)
  const [error, setError] = useState('')
  const heroImageSrc = resolveMediaSrc(profile.perfil_hero_image_url)
  const { heroStyle, heroReady } = useHeroBackground(heroImageSrc)

  useEffect(() => {
    const controller = new AbortController()

    const loadProfile = async () => {
      try {
        const response = await fetch('/api/content/profile/', { signal: controller.signal })
        if (!response.ok) throw new Error('Falha atu karga perfil TANE.')
        const payload = await response.json()
        setProfile(payload.profile)
        writeProfileContentCache(payload)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()

    return () => {
      controller.abort()
    }
  }, [])

  return (
    <>
      {/* ── Page Hero ── */}
      <div
        className={`page-hero${heroReady ? ' hero-bg-ready' : ''}`}
        style={heroStyle}
      >
        <div className="page-hero-overlay" />
        <div className="container page-hero-content">
          <div className="page-hero-badge">
            <Landmark size={14} strokeWidth={2} /> Perfil Organizasaun
          </div>
          <h1>Perfil TANE</h1>
          <p>
            Koñese TANE liu husi fundamentu institusionál ne'ebé orienta ami
            nia kompromisu ba direitu konsumidor iha Timor-Leste.
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <section className="content-section">
        <div className="container">

          {isLoading ? <p>Karga perfil...</p> : null}
          {error ? <p className="error-text">{error}</p> : null}

          {!isLoading && !error ? (
            <>
              <div className="perfil-story-stack fade-section">
                {STORY_SECTIONS.map((section, index) => {
                  const imageSrc = resolveMediaSrc(profile[section.imageKey])
                  const description = profile[section.key] || section.fallback

                  return (
                    <article
                      key={section.key}
                      className={`perfil-story-card fade-section${section.reverse ? ' is-reverse' : ''}`}
                      style={{ '--reveal-delay': `${index * 70}ms` }}
                    >
                      <div className="perfil-story-media">
                        {imageSrc ? (
                          <img src={imageSrc} alt={`${section.badge} TANE`} loading="lazy" />
                        ) : (
                          <div className="perfil-story-media-empty">
                            <section.Icon size={34} strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="perfil-story-content">
                        <div className="perfil-story-badge">
                          <section.Icon size={15} strokeWidth={2} />
                          {section.badge}
                        </div>
                        <h2>
                          {section.key === 'about_intro'
                            ? (profile.organization_name || 'TANE Konsumidor')
                            : `${section.badge} TANE`}
                        </h2>
                        <div className="overview-divider" />
                        <div className="overview-lead rich-html" dangerouslySetInnerHTML={{ __html: description }} />
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </>
  )
}

export default PerfilPage
