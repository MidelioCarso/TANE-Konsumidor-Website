import { useEffect, useState } from 'react'

const initialData = {
  profile: {
    organization_name: 'TANE Konsumidor',
    vision: '',
    mision: '',
    valor: '',
  },
  history: [],
  stakeholders: [],
  objectives: [],
}

function AboutPage() {
  const [data, setData] = useState(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadAboutContent = async () => {
      try {
        const response = await fetch('/api/content/profile/')

        if (!response.ok) {
          throw new Error('Falha atu karga konteúdu kona-ba ami.')
        }

        const payload = await response.json()

        setData({
          profile: payload.profile,
          history: payload.history || [],
          stakeholders: payload.strategic_plan?.stakeholders || [],
          objectives: payload.strategic_plan?.objectives || [],
        })
      } catch (fetchError) {
        setError(fetchError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadAboutContent()
  }, [])

  return (
    <section className="content-section about-page">
      <div className="container">
        <div className="page-intro">
          <h1>Kona-ba TANE</h1>
          <p>
            Hatene kona-ba TANE nia istória, fundamentu institusionál, no planu
            estratejiku ba dezenvolvimentu organizasaun.
          </p>
        </div>
        {isLoading ? <p>Karga...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!isLoading && !error ? (
          <>
            <div className="section-head">
              <h2>Ami nia Fundamentu</h2>
              <p>Prinsipiu sira ne'ebé orienta ami nia servisu no kompromisu naruk.</p>
            </div>
            <div className="card-grid about-foundation-grid">
              <article className="info-card card-hover">
                <div className="card-icon">🔭</div>
                <h3>Vizaun</h3>
                <p>{data.profile.vision || 'Vizaun seidauk aumenta.'}</p>
              </article>
              <article className="info-card card-hover">
                <div className="card-icon">🎯</div>
                <h3>Misaun</h3>
                <p>{data.profile.mision || 'Misaun seidauk aumenta.'}</p>
              </article>
              <article className="info-card card-hover">
                <div className="card-icon">⭐</div>
                <h3>Valor</h3>
                <p>{data.profile.valor || 'Valor seidauk aumenta.'}</p>
              </article>
            </div>

            <div className="section-head section-title">
              <h2>Planu Estratejiku TANE</h2>
              <p>
                Direksaun estratéjiku ne'ebé orienta TANE hodi aumenta impaktu
                iha komunidade.
              </p>
            </div>

            <div className="section-head">
              <h2>Istória TANE</h2>
            </div>
            {data.history.length ? (
              <div className="card-grid">
                {data.history.map((historyItem) => (
                  <article key={historyItem.id} className="about-history-card">
                    <div className="about-history-icon">📜</div>
                    <div>
                      <h3>{historyItem.title}</h3>
                      <p>{historyItem.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p>Istória seidauk aumenta.</p>
            )}

            <div className="section-head section-title">
              <h2>Ami nia Stakeholders Chave</h2>
            </div>
            {data.stakeholders.length ? (
              <ul className="stakeholder-list">
                {data.stakeholders.map((stakeholder) => (
                  <li key={stakeholder.id} className="stakeholder-item">
                    <span className="stakeholder-bullet">▶</span>
                    {stakeholder.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Stakeholders seidauk aumenta.</p>
            )}

            <div className="section-head section-title">
              <h2>Ami nia Estratejia Sira</h2>
            </div>
            {data.objectives.length ? (
              <div className="table-wrap">
                <table className="strategy-table">
                  <thead>
                    <tr>
                      <th>Objetivu Estratejiku</th>
                      <th>Atividade Estratejiku</th>
                      <th>Sasukat Susesu nian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.objectives.map((objective) => (
                      <tr key={objective.id}>
                        <td>{objective.strategic_objective}</td>
                        <td>{objective.strategic_activity}</td>
                        <td>{objective.success_measure}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Estratejia sira seidauk aumenta.</p>
            )}
          </>
        ) : null}
      </div>
    </section>
  )
}

export default AboutPage
