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
  hydrateTokens,
  setTokens,
} from '@/lib/authStorage'
import type { AuthTokensResponse, AuthUser } from '@/types/schema'

type AuthState = {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
}

type AuthContextValue = AuthState & {
  applySession: (session: AuthTokensResponse) => Promise<void>
  login: (email: string, password: string) => Promise<AuthTokensResponse>
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

  const applySession = useCallback(async (session: AuthTokensResponse) => {
    await setTokens(session.accessToken, session.refreshToken)
    setUser(session.user)
  }, [])

  const bootstrap = useCallback(async () => {
    await hydrateTokens()
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
        await applySession(await authApi.refreshSession(refresh))
      }
    } catch {
      await clearTokens()
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
      const session = await authApi.login({ email, password })
      await applySession(session)
      return session
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
      await applySession(await authApi.signup(input))
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    const refresh = getRefreshToken()
    await clearTokens()
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
