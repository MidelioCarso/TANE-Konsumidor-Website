import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import '../../admin.css'

export default function AdminLogin() {
  const { login, user, loading: authLoading } = useAdminAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Already authenticated → skip login
  useEffect(() => {
    if (!authLoading && user) navigate('/admin-panel', { replace: true })
  }, [authLoading, user, navigate])

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('Username no password tenke preense.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await login(form.username.trim(), form.password)
      navigate('/admin-panel', { replace: true })
    } catch (err) {
      setError(err.message || 'Login la susesu. Tenta fali.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="adm-login-screen">
      <div className="adm-login-card">
        {/* Brand */}
        <div className="adm-login-brand">
          <img src="/logo_nav.png" alt="TANE Konsumidor" />
          <h1>Admin Portal</h1>
          <p>TANE Konsumidor — Painel Administrativu</p>
        </div>

        <div className="adm-login-divider" />

        {/* Error */}
        {error && (
          <div className="adm-login-error">
            <AlertCircle size={16} strokeWidth={2} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="adm-form-group">
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              className="adm-input"
              type="text"
              name="username"
              autoComplete="username"
              placeholder="Enter your username"
              value={form.username}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="adm-form-group">
            <label htmlFor="admin-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-password"
                className="adm-input"
                style={{ paddingRight: 44 }}
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
              />
              <button
                type="button"
                className="adm-btn-icon"
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#8aab98',
                }}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="adm-btn adm-btn-primary adm-btn-full"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <>
                <span
                  className="adm-spinner"
                  style={{ width: 18, height: 18, borderWidth: 2 }}
                />
                Autentica...
              </>
            ) : (
              <>
                <ShieldCheck size={16} strokeWidth={2} />
                Log In
              </>
            )}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: '0.78rem',
            color: '#8aab98',
          }}
        >
          Asesu restriktu ba utilizadór ho papél admin autorizadu.
        </p>
      </div>
    </div>
  )
}
