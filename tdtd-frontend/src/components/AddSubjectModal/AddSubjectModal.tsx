import { type FormEvent, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { registerSchoolYearSubject } from '../../api/schoolYearApi'
import { ApiError } from '../../lib/http'
import { Button } from '@/components/Button/Button'
import {
  errorAlertClass,
  formInputClasses,
  formLabelClass,
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

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[min(90svh,640px)] w-full max-w-md overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] shadow-xl sm:rounded-2xl sm:pb-5"
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? 'Saving…' : 'Add subject'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
