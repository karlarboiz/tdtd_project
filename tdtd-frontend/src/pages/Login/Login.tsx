import { FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { PageContainer } from '@/layouts/PageContainer'
import { useAuth } from '@/contexts/AuthContext'
import {
  bodyMutedClass,
  errorAlertClass,
  formInputClasses,
  formLabelClass,
  primaryButtonClass,
} from '@/lib/uiClasses'

export function Login() {
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from?.toString() || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!authLoading && isAuthenticated) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className={`mt-1 ${bodyMutedClass}`}>
        Teacher&apos;s Dilemma Today
      </p>

      <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="login-email" className={formLabelClass}>
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            className={`mt-1 ${formInputClasses()}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="login-password" className={formLabelClass}>
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            className={`mt-1 ${formInputClasses()}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? <p className={errorAlertClass}>{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className={`${primaryButtonClass} px-4 py-3`}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className={`mt-6 ${bodyMutedClass}`}>
        No account?{' '}
        <Link to="/signup" className="font-semibold text-primary hover:underline">
          Create one
        </Link>
      </p>
    </PageContainer>
  )
}
