import { type FormEvent, useState } from 'react'

import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { PageContentReveal } from '@/layouts/PageContentReveal'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/Button/Button'
import {
  bodyMutedClass,
  errorAlertClass,
  formInputClasses,
  formLabelClass,
} from '@/lib/uiClasses'

export function Login() {
  const { login, isAuthenticated, loading: authLoading, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from?.toString() || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!authLoading && isAuthenticated) {
    if (user?.mustChangePassword) {
      return <Navigate to="/change-password" replace state={{ from }} />
    }
    return <Navigate to={from} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const session = await login(email, password)
      if (session.user.mustChangePassword) {
        navigate('/change-password', { replace: true, state: { from } })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back — sign in to continue."
    >
      <PageContentReveal>
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
            <p className="mt-2 text-right text-sm">
              <Link
                to="/forgot-password"
                className="font-semibold text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </p>
          </div>
          {error ? (
            <p
              className={`rounded-xl bg-accent/10 px-3 py-2 ${errorAlertClass}`}
            >
              {error}
            </p>
          ) : null}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p
          className={`mt-6 border-t border-slate-100 pt-6 ${bodyMutedClass}`}
        >
          No account?{' '}
          <Link
            to="/signup"
            className="font-semibold text-primary hover:underline"
          >
            Create one
          </Link>
        </p>
      </PageContentReveal>
    </AuthLayout>
  )
}
