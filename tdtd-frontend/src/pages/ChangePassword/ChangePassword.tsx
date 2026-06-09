import { FormEvent, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { PageContainer } from '@/layouts/PageContainer'
import * as authApi from '@/api/authApi'
import { useAuth } from '@/contexts/AuthContext'
import {
  bodyMutedClass,
  errorAlertClass,
  formInputClasses,
  formLabelClass,
  primaryButtonClass,
} from '@/lib/uiClasses'

export function ChangePassword() {
  const { user, loading: authLoading, applySession, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from?.toString() || '/'

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: '/change-password' }} />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      applySession(
        await authApi.changePassword({ currentPassword, newPassword }),
      )
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold text-slate-900">Change password</h1>
      <p className={`mt-1 ${bodyMutedClass}`}>
        {user?.mustChangePassword
          ? 'Your password has expired. Choose a new password to continue.'
          : 'Update your password to keep your account secure.'}
      </p>

      <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="change-current" className={formLabelClass}>
            Current password
          </label>
          <input
            id="change-current"
            type="password"
            autoComplete="current-password"
            required
            className={`mt-1 ${formInputClasses()}`}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="change-new" className={formLabelClass}>
            New password
          </label>
          <input
            id="change-new"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={`mt-1 ${formInputClasses()}`}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">At least 8 characters</p>
        </div>
        <div>
          <label htmlFor="change-confirm" className={formLabelClass}>
            Confirm new password
          </label>
          <input
            id="change-confirm"
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
        <button
          type="submit"
          disabled={submitting}
          className={`${primaryButtonClass} px-4 py-3`}
        >
          {submitting ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </PageContainer>
  )
}
