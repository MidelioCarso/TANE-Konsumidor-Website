import { AlertTriangle } from 'lucide-react'

export default function AdminUnsavedNotice({ show, message = 'Ita halo mudansa maibé seidauk save.' }) {
  if (!show) return null

  return (
    <div className="adm-unsaved-notice" role="status" aria-live="polite">
      <AlertTriangle size={16} />
      {message}
    </div>
  )
}
