import { useEffect, useState } from 'react'
import {
  Landmark, Handshake, Globe, Users, ClipboardList,
  Building2, Scale, GraduationCap, Briefcase, Sprout,
  Target, Zap, Ruler, Users2, BarChart3
} from 'lucide-react'
import useHeroBackground from '../../hooks/useHeroBackground'
import { resolveMediaSrc } from '../../utils/media'
import { readProfileContentCache, writeProfileContentCache } from '../../utils/profileCache'

const STAKEHOLDER_ICONS = [
  Landmark, Handshake, Globe, Users, ClipboardList,
  Building2, Scale, GraduationCap, Briefcase, Sprout,
]

function PlanuPage() {
  const cachedContent = readProfileContentCache()
  const [stakeholders, setStakeholders] = useState(cachedContent?.strategic_plan?.stakeholders || [])
  const [objectives, setObjectives] = useState(cachedContent?.strategic_plan?.objectives || [])
  const [heroImage, setHeroImage] = useState(cachedContent?.profile?.planu_hero_image_url || '')
  const [isLoading, setIsLoading] = useState(() => !cachedContent)
  const [error, setError] = useState('')
  const heroImageSrc = resolveMediaSrc(heroImage)
  const { heroStyle, heroReady } = useHeroBackground(heroImageSrc)

  useEffect(() => {
    const controller = new AbortController()

    const loadPlanu = async () => {
      try {
        const response = await fetch('/api/content/profile/', { signal: controller.signal })
        if (!response.ok) throw new Error('Falha atu karga planu estratejiku.')
        const payload = await response.json()
        setStakeholders(payload.strategic_plan?.stakeholders || [])
        setObjectives(payload.strategic_plan?.objectives || [])
        setHeroImage(payload.profile?.planu_hero_image_url || '')
        writeProfileContentCache(payload)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    loadPlanu()

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
        <div className="page-hero-overlay page-hero-overlay--deep" />
        <div className="container page-hero-content">
          <div className="page-hero-badge">
            <ClipboardList size={14} strokeWidth={2} /> Diresaun Estratéjiku
          </div>
          <h1>Planu Estratejiku TANE</h1>
          <p>
            Objetivu, atividade, no sasukat susesu sira ne'ebé orienta TANE
            hodi maximiza impaktu ba komunidade konsumidor iha Timor-Leste.
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <section className="content-section">
        <div className="container">

          {isLoading ? <p>Karga planu estratejiku...</p> : null}
          {error ? <p className="error-text">{error}</p> : null}

          {!isLoading && !error ? (
            <>
              {/* ── Key Stakeholders ── */}
              <div className="section-head fade-section">
                <div className="section-badge-row">
                  <span className="section-badge"><Users2 size={13} strokeWidth={2} /> Stakeholders</span>
                </div>
                <h2>Stakeholders Xave TANE Nian</h2>
                <p>
                  Parseiru institusionál no komunidade sira ne'ebé forma
                  ekosistema TANE nian liu husi kolaborasaun no apoiu.
                </p>
              </div>

              {stakeholders.length ? (
                <div className="stakeholder-visual-grid fade-section">
                  {stakeholders.map((stakeholder, index) => (
                    <div key={stakeholder.id} className="stakeholder-visual-card">
                      <div className="stakeholder-visual-icon">
                        {(() => { const I = STAKEHOLDER_ICONS[index % STAKEHOLDER_ICONS.length]; return <I size={26} strokeWidth={1.5} /> })()}
                      </div>
                      {stakeholder.title && (
                        <span className="stakeholder-visual-badge">{stakeholder.title}</span>
                      )}
                      <span className="stakeholder-visual-name">{stakeholder.name}</span>
                      {stakeholder.subtitle && (
                        <p className="stakeholder-visual-subtitle">{stakeholder.subtitle}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state fade-section" style={{ marginBottom: 40 }}>
                  <div className="empty-state-icon"><Users size={48} strokeWidth={1} /></div>
                  <h3>Stakeholders seidauk aumenta</h3>
                  <p>Konteúdu seidauk iha.</p>
                </div>
              )}

              {/* ── Strategy Table ── */}
              <div className="section-head section-title fade-section">
                <div className="section-badge-row">
                  <span className="section-badge"><BarChart3 size={13} strokeWidth={2} /> Estratejia</span>
                </div>
                <h2>Tabela Estratejiku TANE</h2>
                <p>
                  Objetivu estratejiku, atividade, no sasukat susesu sira ne'ebé
                  TANE adopta ba períodu ida ne'e.
                </p>
              </div>

              {objectives.length ? (
                <div className="table-wrap fade-section">
                  <table className="strategy-table">
                    <thead>
                      <tr>
                        <th>
                          <Target size={14} strokeWidth={2} className="th-icon" />
                          Objetivu Estratejiku
                        </th>
                        <th>
                          <Zap size={14} strokeWidth={2} className="th-icon" />
                          Atividade Estratejiku
                        </th>
                        <th>
                          <Ruler size={14} strokeWidth={2} className="th-icon" />
                          Sasukat Susesu Nian
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {objectives.map((objective) => (
                        <tr key={objective.id}>
                          <td>
                            <div className="td-primary rich-html" dangerouslySetInnerHTML={{ __html: objective.objetivu_estratejiku || objective.strategic_objective || '' }} />
                          </td>
                          <td>
                            <div className="rich-html" dangerouslySetInnerHTML={{ __html: objective.atividade_estratejiku || objective.strategic_activity || '' }} />
                          </td>
                          <td>
                            <div className="td-measure rich-html" dangerouslySetInnerHTML={{ __html: objective.sasukat_susesu_nian || objective.success_measure || '' }} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state fade-section">
                  <div className="empty-state-icon"><BarChart3 size={48} strokeWidth={1} /></div>
                  <h3>Estratejia seidauk aumenta</h3>
                  <p>Konteúdu sei iha lalais.</p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>
    </>
  )
}

export default PlanuPage
