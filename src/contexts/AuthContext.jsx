import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)
const STORAGE_KEY = 'r9_session'

function decodeSession(token) {
  if (!token) return null
  try {
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'))
    const parts = decoded.split('|')
    if (parts.length < 3) return null
    const email = parts[0]
    const exp = Number(parts[1])
    if (!email || !exp || Date.now() > exp) return null
    return { email, expiresAt: exp }
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [session, setSession]           = useState(null)
  const [pendingToken, setPendingToken] = useState(null)
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY)
    const parsed = decodeSession(token)
    if (parsed) setSession({ ...parsed, token })
    else if (token) localStorage.removeItem(STORAGE_KEY)
    setLoading(false)
  }, [])

  const sendOtp = async (email) => {
    try {
      const res = await fetch('/.netlify/functions/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { error: { message: data.details || data.error || 'Erro ao enviar código' } }
      }
      setPendingToken(data.token)
      return { error: null }
    } catch (e) {
      return { error: { message: e.message || 'Falha de conexão' } }
    }
  }

  const verifyOtp = async (_email, code) => {
    try {
      if (!pendingToken) {
        return { error: { message: 'Solicite um novo código' } }
      }
      const res = await fetch('/.netlify/functions/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: pendingToken, code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { error: { message: data.error || 'Código inválido' } }
      }
      localStorage.setItem(STORAGE_KEY, data.sessionToken)
      setSession({ email: data.email, expiresAt: data.expiresAt, token: data.sessionToken })
      setPendingToken(null)
      return { error: null }
    } catch (e) {
      return { error: { message: e.message || 'Falha de conexão' } }
    }
  }

  const signOut = async () => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
    setPendingToken(null)
  }

  const user    = session ? { id: session.email, email: session.email } : null
  const profile = session ? { id: session.email, email: session.email } : null

  return (
    <AuthContext.Provider value={{ user, profile, loading, sendOtp, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
