import { type FormEvent, useEffect, useId, useState } from 'react'
import { registerSchoolYearSubject } from '../../api/schoolYearApi'
import { ApiError } from '../../lib/http'
import {
  errorAlertClass,
  formInputClasses,
  formLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/lib/uiClasses'

type AddSubjectModalProps = {
  open: boolean
  schoolYearId: string
  onClose: () => void
  onSaved: () => void
}

export function AddSubjectModal({
  open,
  schoolYearId,
  onClose,
  onSaved,
}: AddSubjectModalProps) {
  const titleId = useId()
  const [name, setName] = useState('')
  const [shortCode, setShortCode] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('')
    setShortCode('')
    setGradeLevel('')
    setError(null)
    setBusy(false)
  }, [open])

  if (!open) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedGrade = gradeLevel.trim()
    if (!trimmedName) {
      setError('Subject name is required.')
      return
    }
    if (!trimmedGrade) {
      setError('Grade level is required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await registerSchoolYearSubject(schoolYearId, {
        name: trimmedName,
        shortCode: shortCode.trim() || undefined,
        gradeLevel: trimmedGrade,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not add subject. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  const inputError = Boolean(error)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          Add subject
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Registers this subject for the active school year.
        </p>

        {error ? (
          <p className={`mt-3 ${errorAlertClass}`} role="alert">
            {error}
          </p>
        ) : null}

        <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-3">
          <div>
            <label htmlFor="subject-name" className={formLabelClass}>
              Name
            </label>
            <input
              id="subject-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              className={`mt-1 py-2 ${formInputClasses({ error: inputError })}`}
              placeholder="e.g. Mathematics"
              autoFocus
              aria-invalid={inputError}
            />
          </div>
          <div>
            <label htmlFor="subject-grade" className={formLabelClass}>
              Grade level
            </label>
            <input
              id="subject-grade"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              disabled={busy}
              className={`mt-1 py-2 ${formInputClasses({ error: inputError })}`}
              placeholder="e.g. Grade 5"
              aria-invalid={inputError}
            />
          </div>
          <div>
            <label htmlFor="subject-code" className={formLabelClass}>
              Short code (optional)
            </label>
            <input
              id="subject-code"
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value)}
              disabled={busy}
              className={`mt-1 py-2 ${formInputClasses()}`}
              placeholder="e.g. MATH"
            />
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className={`px-4 py-2.5 text-sm ${secondaryButtonClass}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`px-4 py-2.5 text-sm ${primaryButtonClass}`}
            >
              {busy ? 'Saving…' : 'Add subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
