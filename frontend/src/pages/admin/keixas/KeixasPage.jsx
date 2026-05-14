import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle,
  CircleDashed,
  Eye,
  Filter,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react'
import Pagination from '../../../components/admin/Pagination'
import { resolveMediaSrc } from '../../../utils/media'

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ConfirmModal({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="adm-modal-overlay">
      <div className="adm-modal">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="adm-modal-actions">
          <button className="adm-btn adm-btn-secondary" onClick={onCancel} disabled={loading}>
            Kansela
          </button>
          <button
            className="adm-btn adm-btn-danger"
            style={{ background: '#d93025', color: '#fff', padding: '10px 20px' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Delete...' : 'Sim, Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function statusBadgeClass(status) {
  if (status === 'resolved') return 'adm-badge--green'
  if (status === 'cancelled') return 'adm-badge--red'
  return 'adm-badge--amber'
}

function statusLabel(status) {
  if (status === 'resolved') return 'Resolvidu'
  if (status === 'cancelled') return 'Kanseladu'
  return 'Pending'
}

function DetailModal({ complaint, onClose, onUpdateComplaint, loading }) {
  const imageSrc = resolveMediaSrc(complaint.evidence_photo_url)

  const updateStatus = (status) => {
    onUpdateComplaint({ status, is_read: true })
  }

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal adm-keixa-modal" onClick={(e) => e.stopPropagation()}>
        <div className="adm-keixa-modal-header">
          <div>
            <h3>Detallu Keixa</h3>
            <p>Submete iha {formatDate(complaint.created_at)}</p>
          </div>
          <div className="adm-keixa-status-stack">
            <span className={`adm-badge ${statusBadgeClass(complaint.status)}`}>
              {statusLabel(complaint.status)}
            </span>
            <span className={`adm-badge ${complaint.is_read ? 'adm-badge--green' : 'adm-badge--amber'}`}>
              {complaint.is_read ? 'Lee Ona' : 'Seidauk Lee'}
            </span>
          </div>
        </div>

        <div className="adm-keixa-grid">
          <div className="adm-keixa-card">
            <span className="adm-keixa-label">Naran Kompletu</span>
            <span className="adm-keixa-value">{complaint.full_name}</span>
          </div>
          <div className="adm-keixa-card">
            <span className="adm-keixa-label">Numeru Telefone</span>
            <span className="adm-keixa-value">{complaint.phone}</span>
          </div>
          <div className="adm-keixa-card">
            <span className="adm-keixa-label">Hela Fatin</span>
            <span className="adm-keixa-value">{complaint.residence}</span>
          </div>
          <div className="adm-keixa-card">
            <span className="adm-keixa-label">Entidade</span>
            <span className="adm-keixa-value">{complaint.entity_name}</span>
          </div>
          <div className="adm-keixa-card">
            <span className="adm-keixa-label">IP</span>
            <span className="adm-keixa-value">{complaint.source_ip || '—'}</span>
          </div>
          <div className="adm-keixa-card">
            <span className="adm-keixa-label">Evidensia</span>
            <span className="adm-keixa-value">
              {imageSrc ? (
                <a href={imageSrc} target="_blank" rel="noreferrer" className="adm-keixa-link">
                  Loke foto
                </a>
              ) : (
                'La iha'
              )}
            </span>
          </div>
        </div>

        <div className="adm-keixa-note-block">
          <h4>Problema</h4>
          <p>{complaint.problem_description}</p>
        </div>

        <div className="adm-keixa-note-block">
          <h4>Pedidu Ajuda</h4>
          <p>{complaint.assistance_request}</p>
        </div>

        <div className="adm-modal-actions adm-keixa-actions-row">
          <button className="adm-btn adm-btn-secondary" onClick={onClose}>
            Taka
          </button>

          <div className="adm-keixa-action-group">
            <button
              className="adm-btn adm-btn-secondary"
              onClick={() => onUpdateComplaint({ is_read: !complaint.is_read })}
              disabled={loading}
            >
              {loading ? 'Hein...' : complaint.is_read ? 'Mark Unread' : 'Mark Read'}
            </button>
            <button className="adm-btn adm-btn-primary" onClick={() => updateStatus('pending')} disabled={loading}>
              Pending
            </button>
            <button className="adm-btn adm-btn-primary" onClick={() => updateStatus('resolved')} disabled={loading}>
              Resolvidu
            </button>
            <button className="adm-btn adm-btn-danger" onClick={() => updateStatus('cancelled')} disabled={loading}>
              Kanseladu
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function KeixasPage() {
  const [complaints, setComplaints] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, cancelled: 0, unread: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [readFilter, setReadFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const statCards = useMemo(
    () => [
      { label: 'Total Keixa', value: stats.total, className: 'adm-stat-icon--blue', Icon: ShieldAlert },
      { label: 'Pending', value: stats.pending, className: 'adm-stat-icon--amber', Icon: CircleDashed },
      { label: 'Resolvidu', value: stats.resolved, className: 'adm-stat-icon--green', Icon: CheckCircle },
      { label: 'Kanseladu', value: stats.cancelled, className: 'adm-stat-icon--rose', Icon: X },
    ],
    [stats]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => setPage(1), [debouncedSearch, statusFilter, readFilter, perPage])

  useEffect(() => {
    setLoadingStats(true)
    fetch('/api/admin/complaints/stats/', { credentials: 'same-origin' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Falha atu karga estatistika keixas.')
        return data
      })
      .then((data) => {
        setStats({
          total: Number(data.total || 0),
          pending: Number(data.pending || 0),
          resolved: Number(data.resolved || 0),
          cancelled: Number(data.cancelled || 0),
          unread: Number(data.unread || 0),
        })
      })
      .catch((statsError) => {
        setError(statsError.message || 'Falha atu karga estatistika keixas.')
      })
      .finally(() => setLoadingStats(false))
  }, [refreshKey])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('per_page', String(perPage))
    if (debouncedSearch) params.set('q', debouncedSearch)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (readFilter !== 'all') params.set('read_state', readFilter)

    fetch(`/api/admin/complaints/?${params.toString()}`, { credentials: 'same-origin' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Falha atu karga keixas.')
        return data
      })
      .then((data) => {
        const rows = data.complaints || []
        const meta = data.pagination || {}
        setComplaints(rows)
        setTotalItems(meta.total_items ?? rows.length)
        setTotalPages(meta.total_pages ?? 1)
        if (meta.page && meta.page !== page) {
          setPage(meta.page)
        }
        setError('')
      })
      .catch((loadError) => {
        setError(loadError.message || 'Falha atu karga keixas.')
      })
      .finally(() => setLoading(false))
  }, [page, perPage, debouncedSearch, statusFilter, readFilter, refreshKey])

  const handleUpdateComplaint = async (item, payload) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/complaints/${item.id}/`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Falha atu atualiza keixa.')

      setSelectedComplaint(data.complaint || null)
      setSuccessMsg('Keixa atualiza ona ho susesu.')
      setRefreshKey((key) => key + 1)
      setTimeout(() => setSuccessMsg(''), 3500)
    } catch (updateError) {
      setError(updateError.message || 'Falha atu atualiza keixa.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/complaints/${deleteTarget.id}/`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!response.ok) throw new Error('Falha atu delete keixa.')

      setDeleteTarget(null)
      setSelectedComplaint(null)
      setSuccessMsg('Keixa deleta ona.')
      setRefreshKey((key) => key + 1)
      setTimeout(() => setSuccessMsg(''), 3500)
    } catch (deleteError) {
      setError(deleteError.message || 'Falha atu delete keixa.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <div className="adm-topbar">
        <div className="adm-topbar-breadcrumb">
          <span>Admin</span>
          <span className="sep">/</span>
          <span className="current">Keixas</span>
        </div>
      </div>

      <div className="adm-content">
        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">Keixas</h1>
            <p className="adm-page-subtitle">Jere keixas konsumidór no acompanha resolusaun husi ida-idak.</p>
          </div>
        </div>

        {loadingStats ? (
          <div className="adm-stats-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="adm-stat-card">
                <div className="adm-stat-icon adm-stat-icon--green" style={{ background: '#f0f4f2' }} />
                <div className="adm-stat-info">
                  <strong style={{ color: '#dde8e2', background: '#dde8e2' }}>&nbsp;&nbsp;&nbsp;&nbsp;</strong>
                  <span style={{ visibility: 'hidden' }}>Loading</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="adm-stats-grid">
            {statCards.map((card) => (
              <div key={card.label} className="adm-stat-card">
                <div className={`adm-stat-icon ${card.className}`}>
                  <card.Icon size={22} strokeWidth={1.8} />
                </div>
                <div className="adm-stat-info">
                  <strong>{card.value}</strong>
                  <span>{card.label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {successMsg && (
          <div className="adm-alert adm-alert--success">
            <CheckCircle size={16} />
            {successMsg}
          </div>
        )}
        {error && (
          <div className="adm-alert adm-alert--error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="adm-toolbar">
          <div className="adm-search-bar">
            <Search size={16} style={{ color: '#8aab98', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buka naran, telefone, fatin, entidade..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8aab98', padding: 0, display: 'flex' }}
                onClick={() => setSearch('')}
                title="Hamoos buka"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="adm-filter-select">
            <Filter size={14} style={{ color: '#8aab98' }} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Workflow: Hotu</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolvidu</option>
              <option value="cancelled">Kanseladu</option>
            </select>
          </div>

          <div className="adm-filter-select">
            <Filter size={14} style={{ color: '#8aab98' }} />
            <select value={readFilter} onChange={(event) => setReadFilter(event.target.value)}>
              <option value="all">Dokumentu: Hotu</option>
              <option value="unread">Seidauk Lee</option>
              <option value="read">Lee Ona</option>
            </select>
          </div>

          <span style={{ fontSize: '0.82rem', color: 'var(--adm-text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {totalItems} rezultadu
          </span>
        </div>

        {loading ? (
          <div className="adm-loading-row">
            <div className="adm-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : totalItems > 0 ? (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th style={{ width: 52 }}>#</th>
                    <th>Naran</th>
                    <th>Entidade</th>
                    <th>Status</th>
                    <th>Dokumentu</th>
                    <th>Data</th>
                    <th style={{ width: 200 }}>Aksaun</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ color: 'var(--adm-text-muted)', fontWeight: 600 }}>
                        {String((page - 1) * perPage + idx + 1).padStart(2, '0')}
                      </td>
                      <td className="adm-td-title">
                        <div style={{ fontWeight: 600 }}>{item.full_name}</div>
                        <p>{item.phone} · {item.residence}</p>
                      </td>
                      <td>{item.entity_name}</td>
                      <td>
                        <span className={`adm-badge ${statusBadgeClass(item.status)}`}>
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td>
                        <span className={`adm-badge ${item.is_read ? 'adm-badge--green' : 'adm-badge--amber'}`}>
                          {item.is_read ? 'Lee Ona' : 'Seidauk Lee'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--adm-text-secondary)', fontSize: '0.86rem' }}>
                        {formatDate(item.created_at)}
                      </td>
                      <td>
                        <div className="adm-td-actions">
                          <button
                            className="adm-btn adm-btn-secondary adm-btn-sm"
                            onClick={() => setSelectedComplaint(item)}
                            title="Haree detalhu"
                          >
                            <Eye size={13} strokeWidth={2} />
                          </button>
                          <button
                            className="adm-btn adm-btn-danger adm-btn-sm"
                            onClick={() => setDeleteTarget(item)}
                            title="Delete"
                          >
                            <Trash2 size={13} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              perPage={perPage}
              onPerPageChange={setPerPage}
              totalItems={totalItems}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </>
        ) : (
          <div className="adm-table-wrap">
            <div className="adm-empty">
              <div className="adm-empty-icon">
                <AlertCircle size={42} strokeWidth={1} />
              </div>
              <h3>Seidauk iha keixa</h3>
              <p>Keixa foun sira sei mosu iha ne'e.</p>
            </div>
          </div>
        )}
      </div>

      {selectedComplaint && (
        <DetailModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onUpdateComplaint={(payload) => handleUpdateComplaint(selectedComplaint, payload)}
          loading={actionLoading}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Konfirma Delete"
          message={`Ita boot hakarak delete keixa husi ${deleteTarget.full_name}?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={actionLoading}
        />
      )}
    </>
  )
}
