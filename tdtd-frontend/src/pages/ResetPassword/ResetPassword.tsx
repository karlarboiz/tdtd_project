import { FormEvent, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { PageContainer } from '@/layouts/PageContainer'
import * as authApi from '@/api/authApi'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/Button/Button'
import {
  bodyMutedClass,
  errorAlertClass,
  formInputClasses,
  formLabelClass,
} from '@/lib/uiClasses'

export function ResetPassword() {
  const { applySession, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (!token) {
    return (
      <PageContainer>
        <h1 className="text-2xl font-semibold text-slate-900">Reset password</h1>
        <p className={`mt-1 ${bodyMutedClass}`}>
          This reset link is invalid or incomplete.
        </p>
        <p className={`mt-6 ${bodyMutedClass}`}>
          Request a new link from the{' '}
          <Link
            to="/forgot-password"
            className="font-semibold text-primary hover:underline"
          >
            forgot password
          </Link>{' '}
          page.
        </p>
      </PageContainer>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      applySession(await authApi.resetPassword({ token, password }))
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold text-slate-900">Choose a new password</h1>
      <p className={`mt-1 ${bodyMutedClass}`}>
        Enter a new password for your account.
      </p>

      <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="reset-password" className={formLabelClass}>
            New password
          </label>
          <input
            id="reset-password"
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
        <div>
          <label htmlFor="reset-confirm" className={formLabelClass}>
            Confirm new password
          </label>
          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={`mt-1 ${formInputClasses()}`}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error ? <p className={errorAlertClass}>{error}</p> : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Reset password'}
        </Button>
      </form>
    </PageContainer>
  )
}
