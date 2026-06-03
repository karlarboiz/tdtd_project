import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as authApi from '@/api/authApi'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/lib/authStorage'
import type { AuthTokensResponse, AuthUser } from '@/types/schema'

type AuthState = {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
}

type AuthContextValue = AuthState & {
  applySession: (session: AuthTokensResponse) => void
  login: (email: string, password: string) => Promise<void>
  signup: (input: {
    firstName: string
    lastName: string
    email: string
    password: string
  }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const applySession = useCallback((session: AuthTokensResponse) => {
    setTokens(session.accessToken, session.refreshToken)
    setUser(session.user)
  }, [])

  const bootstrap = useCallback(async () => {
    const access = getAccessToken()
    const refresh = getRefreshToken()
    if (!access && !refresh) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      if (access) {
        setUser(await authApi.fetchMe())
      } else if (refresh) {
        applySession(await authApi.refreshSession(refresh))
      }
    } catch {
      clearTokens()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [applySession])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  const login = useCallback(
    async (email: string, password: string) => {
      applySession(await authApi.login({ email, password }))
    },
    [applySession],
  )

  const signup = useCallback(
    async (input: {
      firstName: string
      lastName: string
      email: string
      password: string
    }) => {
      applySession(await authApi.signup(input))
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    const refresh = getRefreshToken()
    clearTokens()
    setUser(null)
    if (refresh) {
      try {
        await authApi.logout(refresh)
      } catch {
        /* ignore */
      }
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user != null,
      applySession,
      login,
      signup,
      logout,
    }),
    [user, loading, applySession, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
