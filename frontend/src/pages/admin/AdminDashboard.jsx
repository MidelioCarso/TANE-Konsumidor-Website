import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Newspaper,
  CheckCircle2,
  ClipboardCheck,
  FileEdit,
  Tag,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { useAdminAuth } from '../../context/AdminAuthContext'

const FALLBACK_THUMB =
  'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=200&q=60'

const formatDate = (val) => {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function AdminDashboard() {
  const { user } = useAdminAuth()
  const capabilities = user?.capabilities || {}
  const isSuperadmin = Boolean(user?.is_superuser || capabilities.is_superadmin)
  const canManageContent = isSuperadmin || Boolean(capabilities.can_manage_content)
  const canReviewPublish = isSuperadmin || Boolean(capabilities.can_review_publish)
  const canManageKeixas = isSuperadmin || Boolean(capabilities.can_manage_keixas)
  const canManageUsers = isSuperadmin || Boolean(capabilities.can_manage_users)
  const role = capabilities.role || (isSuperadmin ? 'super_admin' : 'none')

  const roleLabelMap = {
    super_admin: 'Super Admin',
    officer_moderator: 'Officer / Moderator',
    staff: 'Staff',
    none: 'Admin',
  }

  const [stats, setStats] = useState(null)
  const [recentNews, setRecentNews] = useState([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingNews, setLoadingNews] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats/')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false))

    if (!canManageContent) {
      setRecentNews([])
      setLoadingNews(false)
      return
    }

    fetch('/api/admin/news/')
      .then((r) => r.json())
      .then((d) => setRecentNews((d.news || []).slice(0, 6)))
      .catch(() => setRecentNews([]))
      .finally(() => setLoadingNews(false))
  }, [canManageContent])

  const STAT_CARDS = stats
    ? [
        ...(canManageContent
          ? [
              {
                label: 'Total Notísias',
                value: stats.total_news,
                Icon: Newspaper,
                colorClass: 'adm-stat-icon--green',
              },
              {
                label: 'Publika',
                value: stats.published_news,
                Icon: CheckCircle2,
                colorClass: 'adm-stat-icon--blue',
              },
              {
                label: 'Draft',
                value: stats.draft_news,
                Icon: FileEdit,
                colorClass: 'adm-stat-icon--amber',
              },
              {
                label: 'Total Tags',
                value: stats.total_tags,
                Icon: Tag,
                colorClass: 'adm-stat-icon--rose',
              },
            ]
          : []),
        ...(canReviewPublish
          ? [
              {
                label: 'Review Notísia Pendente',
                value: stats.pending_news_reviews,
                Icon: ClipboardCheck,
                colorClass: 'adm-stat-icon--amber',
              },
              {
                label: 'Review Publikasaun Pendente',
                value: stats.pending_publication_reviews,
                Icon: ClipboardCheck,
                colorClass: 'adm-stat-icon--amber',
              },
            ]
          : []),
        ...(canManageKeixas
          ? [
              {
                label: 'Keixas Foun',
                value: stats.unread_complaints,
                Icon: AlertCircle,
                colorClass: 'adm-stat-icon--amber',
              },
            ]
          : []),
      ]
    : []

  return (
    <>
      {/* Topbar */}
      <div className="adm-topbar">
        <div className="adm-topbar-breadcrumb">
          <span>Admin</span>
          <span className="sep">/</span>
          <span className="current">Dashboard</span>
        </div>
        <div className="adm-topbar-actions">
          {canManageContent ? (
            <Link
              to="/admin-panel/noticias/new"
              className="adm-btn adm-btn-primary adm-btn-sm"
            >
              <PlusCircle size={15} strokeWidth={2} />
              {canReviewPublish ? 'Notísia Foun' : 'Submete Notísia'}
            </Link>
          ) : null}
          {canReviewPublish ? (
            <Link
              to="/admin-panel/noticias?status=pending"
              className="adm-btn adm-btn-secondary adm-btn-sm"
            >
              <CheckCircle2 size={15} strokeWidth={2} />
              Review Pendentes
            </Link>
          ) : null}
          {canManageKeixas ? (
            <Link
              to="/admin-panel/keixas"
              className="adm-btn adm-btn-secondary adm-btn-sm"
            >
              <AlertCircle size={15} strokeWidth={2} />
              Keixas
            </Link>
          ) : null}
          {canManageUsers ? (
            <Link
              to="/admin-panel/admin-users"
              className="adm-btn adm-btn-secondary adm-btn-sm"
            >
              <Tag size={15} strokeWidth={2} />
              Utilizadores
            </Link>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div className="adm-content">
        {/* Welcome */}
        <div className="adm-page-header">
          <div>
            <h1 className="adm-page-title">
              Bemvindu, {user?.username} 👋
            </h1>
            <p className="adm-page-subtitle">
              Role atual: {roleLabelMap[role] || 'Admin'}.
            </p>
          </div>
          {canManageContent ? (
            <Link
              to="/admin-panel/noticias"
              className="adm-btn adm-btn-secondary"
            >
              <TrendingUp size={15} strokeWidth={2} />
              Haree Notísias Hotu
            </Link>
          ) : null}
        </div>

        {/* Stats */}
        {loadingStats ? (
          <div className="adm-stats-grid">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="adm-stat-card">
                <div
                  className="adm-stat-icon adm-stat-icon--green"
                  style={{ background: '#f0f4f2' }}
                />
                <div className="adm-stat-info">
                  <strong style={{ color: '#dde8e2', background: '#dde8e2' }}>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                  </strong>
                  <span style={{ visibility: 'hidden' }}>Loading</span>
                </div>
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="adm-stats-grid">
            {STAT_CARDS.map((card) => (
              <div key={card.label} className="adm-stat-card">
                <div className={`adm-stat-icon ${card.colorClass}`}>
                  <card.Icon size={22} strokeWidth={1.8} />
                </div>
                <div className="adm-stat-info">
                  <strong>{card.value}</strong>
                  <span>{card.label}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Recent news */}
        {canManageContent ? (
        <div className="adm-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--adm-font-heading)',
                fontSize: '1rem',
                fontWeight: 800,
                margin: 0,
                color: 'var(--adm-text-primary)',
              }}
            >
              {canReviewPublish ? 'Notísias Ikus' : 'Submisaun Ikus'}
            </h2>
            <Link
              to="/admin-panel/noticias"
              className="adm-btn adm-btn-secondary adm-btn-sm"
            >
              Haree hotu
              <ArrowRight size={13} strokeWidth={2} />
            </Link>
          </div>

          {loadingNews ? (
            <div className="adm-loading-row">
              <div
                className="adm-spinner"
                style={{ margin: '0 auto' }}
              />
            </div>
          ) : recentNews.length ? (
            <div className="adm-recent-list">
              {recentNews.map((item) => (
                <div key={item.id} className="adm-recent-item">
                  <img
                    className="adm-recent-thumb"
                    src={item.thumbnail_url || FALLBACK_THUMB}
                    alt={item.title}
                    onError={(e) => {
                      e.target.src = FALLBACK_THUMB
                    }}
                  />
                  <div className="adm-recent-info">
                    <div className="adm-recent-title">{item.title}</div>
                    <div className="adm-recent-date">
                      {formatDate(item.published_at)}
                    </div>
                  </div>
                  <span
                    className={`adm-badge ${
                      item.is_published
                        ? 'adm-badge--green'
                        : 'adm-badge--amber'
                    }`}
                  >
                    {item.is_published ? 'Publika' : 'Draft'}
                  </span>
                  <Link
                    to={`/admin-panel/noticias/${item.id}/edit`}
                    className="adm-btn adm-btn-secondary adm-btn-sm"
                  >
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="adm-empty">
              <div className="adm-empty-icon">
                <Newspaper size={40} strokeWidth={1} />
              </div>
              <h3>Seidauk iha notísia ruma</h3>
              <p>Kria notísia dahuluk hodi hahú.</p>
              <Link
                to="/admin-panel/noticias/new"
                className="adm-btn adm-btn-primary"
              >
                <PlusCircle size={15} />
                {canReviewPublish ? 'Kria Notísia Foun' : 'Submete Notísia Foun'}
              </Link>
            </div>
          )}
        </div>
        ) : null}
      </div>
    </>
  )
}
