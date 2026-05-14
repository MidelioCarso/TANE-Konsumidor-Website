import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'

function AdminSpinner() {
  return (
    <div className="adm-fullscreen-center">
      <div className="adm-spinner" />
    </div>
  )
}

export default function AdminRequireAuth({ children }) {
  const { user, loading } = useAdminAuth()

  if (loading) return <AdminSpinner />
  if (!user) return <Navigate to="/admin-panel/login" replace />
  return children
}
