import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { PageContentReveal } from '@/layouts/PageContentReveal'
import { useAuth } from '@/contexts/AuthContext'
import {
  bodyMutedClass,
  errorAlertClass,
  formInputClasses,
  formLabelClass,
  primaryButtonClass,
} from '@/lib/uiClasses'

export function Signup() {
  const { signup, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signup({ firstName, lastName, email, password })
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Basic details to get started. You can update your profile later."
    >
      <PageContentReveal>
        <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="signup-first" className={formLabelClass}>
                First name
              </label>
              <input
                id="signup-first"
                type="text"
                autoComplete="given-name"
                required
                className={`mt-1 ${formInputClasses()}`}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="signup-last" className={formLabelClass}>
                Last name
              </label>
              <input
                id="signup-last"
                type="text"
                autoComplete="family-name"
                required
                className={`mt-1 ${formInputClasses()}`}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="signup-email" className={formLabelClass}>
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              className={`mt-1 ${formInputClasses()}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="signup-password" className={formLabelClass}>
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className={`mt-1 ${formInputClasses()}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">At least 8 characters</p>
          </div>
          {error ? (
            <p
              className={`rounded-xl bg-accent/10 px-3 py-2 ${errorAlertClass}`}
            >
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className={`w-full ${primaryButtonClass} px-4 py-3`}
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p
          className={`mt-6 border-t border-slate-100 pt-6 ${bodyMutedClass}`}
        >
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </PageContentReveal>
    </AuthLayout>
  )
}
