import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/me/', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setUser({
            username: data.username,
            email: data.email,
            is_superuser: Boolean(data.is_superuser),
            capabilities: data.capabilities || {},
          })
        } else {
          setUser(null)
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    const r = await fetch('/api/admin/login/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || 'Login failed.')
    setUser({
      username: data.username,
      email: data.email,
      is_superuser: Boolean(data.is_superuser),
      capabilities: data.capabilities || {},
    })
    return data
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/admin/logout/', { method: 'POST', credentials: 'same-origin' })
    setUser(null)
  }, [])

  return (
    <AdminAuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  return ctx
}
