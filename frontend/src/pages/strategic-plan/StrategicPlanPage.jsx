import { useEffect, useState } from 'react'

const initialData = {
  misaun: '',
  vizaun: '',
  valores: [],
  stakeholders: [],
  objectives: [],
}

function StrategicPlanPage() {
  const [data, setData] = useState(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadStrategicPlan = async () => {
      try {
        const response = await fetch('/api/content/strategic-plan/')
        if (!response.ok) {
          throw new Error('Failed to load strategic plan content.')
        }
        const payload = await response.json()
        setData(payload)
      } catch (fetchError) {
        setError(fetchError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadStrategicPlan()
  }, [])

  return (
    <section className="content-section">
      <div className="container">
        <div className="page-intro">
          <h1>Planu Estratejiku TANE</h1>
          <p>
            Ita nia misaun, vizaun, valores, stakeholders chave, no estratejia
            ba futuru.
          </p>
        </div>

        {isLoading ? <p>Karga...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!isLoading && !error ? (
          <>
            {/* ── Misaun, Vizaun ── */}
            <div className="section-head">
              <h2>Misaun &amp; Vizaun TANE</h2>
            </div>
            <div className="card-grid">
              <article className="info-card card-hover">
                <div className="card-icon">🎯</div>
                <h3>Misaun TANE</h3>
                <p>{data.misaun || 'Misaun seidauk aumenta.'}</p>
              </article>
              <article className="info-card card-hover">
                <div className="card-icon">🔭</div>
                <h3>Vizaun TANE</h3>
                <p>{data.vizaun || 'Vizaun seidauk aumenta.'}</p>
              </article>
            </div>

            {/* ── Valores ── */}
            <div className="section-head section-title">
              <h2>Valores TANE</h2>
              <p>Prinsipiu sira ne'ebé orienta ita nia servisu.</p>
            </div>
            <div className="card-grid">
              {data.valores.length ? (
                data.valores.map((valor) => (
                  <article key={valor.id} className="info-card card-hover">
                    <div className="card-icon">⭐</div>
                    <h3>{valor.title}</h3>
                    {valor.description ? <p>{valor.description}</p> : null}
                  </article>
                ))
              ) : (
                <p>Valores seidauk aumenta.</p>
              )}
            </div>

            {/* ── Key Stakeholders ── */}
            <div className="section-head section-title">
              <h2>Ami nia Stakeholders Chave</h2>
              <p>Parseiro sira ne'ebé importante ba ita nia misaun.</p>
            </div>
            {data.stakeholders.length ? (
              <ul className="stakeholder-list">
                {data.stakeholders.map((s) => (
                  <li key={s.id} className="stakeholder-item">
                    <span className="stakeholder-bullet">▶</span>
                    {s.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Stakeholders seidauk aumenta.</p>
            )}

            {/* ── Ami nia Estratejia Sira table ── */}
            <div className="section-head section-title">
              <h2>Ami nia Estratejia Sira</h2>
              <p>Objetivu no atividade estratejiku ba susesu organizasaun.</p>
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
                    {data.objectives.map((obj) => (
                      <tr key={obj.id}>
                        <td>{obj.strategic_objective}</td>
                        <td>{obj.strategic_activity}</td>
                        <td>{obj.success_measure}</td>
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

export default StrategicPlanPage
