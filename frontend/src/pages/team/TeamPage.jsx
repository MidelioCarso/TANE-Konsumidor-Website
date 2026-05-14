import { useEffect, useState } from 'react'

const initialData = {
  team: [],
}

const structureRows = [
  {
    level: 'Assembleia Jerál',
    role: 'Orgaun aas desizaun',
    function: 'Aprova direksaun estratéjika no superviza governasaun organizasaun.',
  },
  {
    level: 'Konsellu Diretivu',
    role: 'Lideransa no orientasaun',
    function: 'Fornese orientasaun polítika no garante implementasaun planu institusionál.',
  },
  {
    level: 'Diretór Ezekutivu',
    role: 'Jestaun operasionál',
    function: 'Koordena unidade sira, jere rekursu, no lidera implementasaun programa.',
  },
  {
    level: 'Unidade Programa',
    role: 'Implementasaun atividade',
    function: 'Dezenvolve no implementa edukasaun konsumidor no intervensaun komunidade.',
  },
  {
    level: 'Unidade Defeza no Apoiu Legál',
    role: 'Protesaun direitu konsumidor',
    function: 'Fornese orientasaun legál no akompaña kazu sira relasiona ho direitu konsumidor.',
  },
  {
    level: 'Unidade Administrasaun no Finansas',
    role: 'Suporte institusionál',
    function: 'Jere finansas, rekursu umanu, no sistema administrativu organizasaun.',
  },
]

function TeamPage() {
  const [data, setData] = useState(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadTeamContent = async () => {
      try {
        const response = await fetch('/api/content/about/')
        if (!response.ok) {
          throw new Error('Falha atu karga konteúdu ekipa.')
        }
        const payload = await response.json()
        setData({ team: payload.team || [] })
      } catch (fetchError) {
        setError(fetchError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadTeamContent()
  }, [])

  return (
    <section className="content-section">
      <div className="container">
        <div className="page-intro">
          <h1>Ekipa TANE</h1>
          <p>
            Estrutura organizasionál no organigrama TANE hodi hatudu liña
            lideransa no unidade servisu sira.
          </p>
        </div>

        {isLoading ? <p>Karga...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!isLoading && !error ? (
          <>
            <div className="section-head">
              <h2>Organigrama TANE</h2>
              <p>Estrutura lideransa prinsipál no ligasaun entre unidade sira.</p>
            </div>

            <div className="org-chart">
              <div className="org-chart-top">Assembleia Jerál</div>
              <div className="org-chart-top">Konsellu Diretivu</div>
              <div className="org-chart-main">Diretór Ezekutivu</div>
              <div className="org-chart-grid">
                <div className="org-chart-node">Unidade Programa</div>
                <div className="org-chart-node">Unidade Defeza no Apoiu Legál</div>
                <div className="org-chart-node">Unidade Administrasaun no Finansas</div>
              </div>
            </div>

            <div className="section-head section-title">
              <h2>Estrutura Organizasionál TANE</h2>
              <p>Papel no responsabilidade prinsipal ba kada nivel organizasaun.</p>
            </div>

            <div className="table-wrap">
              <table className="strategy-table">
                <thead>
                  <tr>
                    <th>Nivel</th>
                    <th>Papel</th>
                    <th>Funsaun Prinsipál</th>
                  </tr>
                </thead>
                <tbody>
                  {structureRows.map((row) => (
                    <tr key={row.level}>
                      <td>{row.level}</td>
                      <td>{row.role}</td>
                      <td>{row.function}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="section-head section-title">
              <h2>Membru Ekipa</h2>
              <p>Profisionál sira ne'ebé lidera no implementa atividade TANE.</p>
            </div>

            <div className="card-grid">
              {data.team.length ? (
                data.team.map((member) => (
                  <article key={member.id} className="info-card card-hover">
                    {member.photo_url ? (
                      <div className="card-img-wrap">
                        <img src={member.photo_url} alt={member.full_name} loading="lazy" />
                      </div>
                    ) : (
                      <div className="card-icon">👤</div>
                    )}
                    <h3>{member.full_name}</h3>
                    <p className="card-highlight">{member.role}</p>
                    <p>{member.bio || 'Bio seidauk aumenta.'}</p>
                  </article>
                ))
              ) : (
                <p>La iha perfil ekipa seidauk.</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}

export default TeamPage
