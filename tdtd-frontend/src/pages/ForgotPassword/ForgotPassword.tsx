import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '@/layouts/PageContainer'
import * as authApi from '@/api/authApi'
import {
  bodyMutedClass,
  errorAlertClass,
  formInputClasses,
  formLabelClass,
  primaryButtonClass,
} from '@/lib/uiClasses'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold text-slate-900">Forgot password</h1>
      <p className={`mt-1 ${bodyMutedClass}`}>
        Enter your email and we will send reset instructions if an account exists.
      </p>

      {sent ? (
        <p className={`mt-8 rounded-xl bg-primary/5 px-4 py-3 ${bodyMutedClass}`}>
          If an account exists for that email, we sent password reset
          instructions. Check your inbox and follow the link to choose a new
          password.
        </p>
      ) : (
        <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
          <div>
            <label htmlFor="forgot-email" className={formLabelClass}>
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              className={`mt-1 ${formInputClasses()}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error ? <p className={errorAlertClass}>{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className={`${primaryButtonClass} px-4 py-3`}
          >
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className={`mt-6 ${bodyMutedClass}`}>
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </PageContainer>
  )
}
