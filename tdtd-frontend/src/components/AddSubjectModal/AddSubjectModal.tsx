import { type FormEvent, useEffect, useId, useState } from 'react'
import { registerSchoolYearSubject } from '../../api/schoolYearApi'
import { ApiError } from '../../lib/http'

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
          <p className="mt-3 text-sm font-medium text-accent" role="alert">
            {error}
          </p>
        ) : null}

        <form onSubmit={(e) => void onSubmit(e)} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="subject-name"
              className="block text-sm font-medium text-slate-600"
            >
              Name
            </label>
            <input
              id="subject-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-2 outline-none ring-secondary focus:ring-2 disabled:opacity-50"
              placeholder="e.g. Mathematics"
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="subject-grade"
              className="block text-sm font-medium text-slate-600"
            >
              Grade level
            </label>
            <input
              id="subject-grade"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-2 outline-none ring-secondary focus:ring-2 disabled:opacity-50"
              placeholder="e.g. Grade 5"
            />
          </div>
          <div>
            <label
              htmlFor="subject-code"
              className="block text-sm font-medium text-slate-600"
            >
              Short code (optional)
            </label>
            <input
              id="subject-code"
              value={shortCode}
              onChange={(e) => setShortCode(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-2 outline-none ring-secondary focus:ring-2 disabled:opacity-50"
              placeholder="e.g. MATH"
            />
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Add subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
