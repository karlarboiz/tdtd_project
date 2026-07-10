import { type FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button/Button'
import { PageContainer } from '@/layouts/PageContainer'
import { PageContentReveal } from '@/layouts/PageContentReveal'
import {
  createSchoolYear,
  registerSchoolYearSubject,
} from '@/api/schoolYearApi'
import { useAuth } from '@/contexts/AuthContext'
import { useGetStartedStatus } from '@/hooks/useGetStartedStatus'
import { ApiError } from '@/lib/http'
import {
  clearGetStartedSkipped,
  setGetStartedSkipped,
} from '@/lib/getStartedSkip'
import { defaultSchoolYearLabel } from '@/lib/schoolYearLabel'
import {
  bodyMutedClass,
  errorAlertClass,
  formInputClasses,
  formLabelClass,
} from '@/lib/uiClasses'

export function GetStartedSetUp() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { loading, schoolYear, subjectCount, refresh } = useGetStartedStatus()

  const [setupBusy, setSetupBusy] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [shortCode, setShortCode] = useState('')
  const [subjectBusy, setSubjectBusy] = useState(false)
  const [subjectError, setSubjectError] = useState<string | null>(null)

  const suggestedLabel = defaultSchoolYearLabel()
  const hasSchoolYear = schoolYear !== null
  const canFinish = hasSchoolYear && subjectCount >= 1

  const from =
    typeof location.state === 'object' &&
    location.state !== null &&
    'from' in location.state &&
    typeof (location.state as { from?: unknown }).from === 'string'
      ? (location.state as { from: string }).from
      : '/scores'

  useEffect(() => {
    if (!loading && canFinish) {
      clearGetStartedSkipped(user?.id)
    }
  }, [loading, canFinish, user?.id])

  async function onCreateSchoolYear() {
    setSetupBusy(true)
    setPageError(null)
    try {
      await createSchoolYear({
        label: suggestedLabel,
        setActive: true,
      })
      await refresh()
    } catch (err) {
      setPageError(
        err instanceof ApiError
          ? err.message
          : 'Could not create school year. Try again.',
      )
    } finally {
      setSetupBusy(false)
    }
  }

  async function onAddSubject(e: FormEvent) {
    e.preventDefault()
    if (!schoolYear) return

    const trimmedName = name.trim()
    const trimmedGrade = gradeLevel.trim()
    if (!trimmedName) {
      setSubjectError('Subject name is required.')
      return
    }
    if (!trimmedGrade) {
      setSubjectError('Grade level is required.')
      return
    }

    setSubjectBusy(true)
    setSubjectError(null)
    try {
      await registerSchoolYearSubject(schoolYear.id, {
        name: trimmedName,
        shortCode: shortCode.trim() || undefined,
        gradeLevel: trimmedGrade,
      })
      setName('')
      setShortCode('')
      setGradeLevel('')
      await refresh()
    } catch (err) {
      setSubjectError(
        err instanceof ApiError
          ? err.message
          : 'Could not add subject. Try again.',
      )
    } finally {
      setSubjectBusy(false)
    }
  }

  function onSkip() {
    if (user?.id) setGetStartedSkipped(user.id)
    navigate('/', { replace: true })
  }

  function onFinish() {
    clearGetStartedSkipped(user?.id)
    navigate(from === '/get-started' ? '/scores' : from, { replace: true })
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-600">
          Loading…
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageContentReveal>
        <header className="max-w-lg">
          <h1 className="text-2xl font-semibold text-slate-900">
            Get started set up
          </h1>
          <p className={`mt-2 ${bodyMutedClass}`}>
            Set up your school year and at least one subject so you can record
            grades. You can skip and set this up later on the Subjects page.
          </p>
        </header>

        {pageError ? (
          <p className={`mt-4 max-w-lg ${errorAlertClass}`} role="alert">
            {pageError}
          </p>
        ) : null}

        <div className="mt-8 max-w-lg space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  hasSchoolYear
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-100 text-slate-600'
                }`}
                aria-hidden
              >
                1
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-slate-900">School year</h2>
                {hasSchoolYear ? (
                  <>
                    <p className="mt-1 text-sm text-slate-600">
                      Active school year:{' '}
                      <strong>{schoolYear.label}</strong>
                    </p>
                    <p className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      Done
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-slate-600">
                      Create an active school year (suggested:{' '}
                      <strong>{suggestedLabel}</strong>).
                    </p>
                    <Button
                      type="button"
                      className="mt-4"
                      disabled={setupBusy}
                      onClick={() => void onCreateSchoolYear()}
                    >
                      {setupBusy ? 'Creating…' : 'Create active school year'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </section>

          <section
            className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${
              !hasSchoolYear ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  subjectCount > 0
                    ? 'bg-primary/10 text-primary'
                    : 'bg-slate-100 text-slate-600'
                }`}
                aria-hidden
              >
                2
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-slate-900">First subject</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Register a subject you teach this school year.
                  {subjectCount > 0
                    ? ` ${subjectCount} subject${subjectCount === 1 ? '' : 's'} registered.`
                    : ''}
                </p>

                {subjectError ? (
                  <p className={`mt-3 ${errorAlertClass}`} role="alert">
                    {subjectError}
                  </p>
                ) : null}

                <form
                  onSubmit={(e) => void onAddSubject(e)}
                  className="mt-4 space-y-3"
                >
                  <div>
                    <label htmlFor="gs-subject-name" className={formLabelClass}>
                      Name
                    </label>
                    <input
                      id="gs-subject-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!hasSchoolYear || subjectBusy}
                      className={`mt-1 py-2 ${formInputClasses({ error: Boolean(subjectError) })}`}
                      placeholder="e.g. Mathematics"
                      aria-invalid={Boolean(subjectError)}
                    />
                  </div>
                  <div>
                    <label htmlFor="gs-subject-grade" className={formLabelClass}>
                      Grade level
                    </label>
                    <input
                      id="gs-subject-grade"
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      disabled={!hasSchoolYear || subjectBusy}
                      className={`mt-1 py-2 ${formInputClasses({ error: Boolean(subjectError) })}`}
                      placeholder="e.g. Grade 5"
                      aria-invalid={Boolean(subjectError)}
                    />
                  </div>
                  <div>
                    <label htmlFor="gs-subject-code" className={formLabelClass}>
                      Short code (optional)
                    </label>
                    <input
                      id="gs-subject-code"
                      value={shortCode}
                      onChange={(e) => setShortCode(e.target.value)}
                      disabled={!hasSchoolYear || subjectBusy}
                      className={`mt-1 py-2 ${formInputClasses()}`}
                      placeholder="e.g. MATH"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    disabled={!hasSchoolYear || subjectBusy}
                  >
                    {subjectBusy ? 'Saving…' : 'Add subject'}
                  </Button>
                </form>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
            <Button type="button" disabled={!canFinish} onClick={onFinish}>
              Finish
            </Button>
          </div>
        </div>
      </PageContentReveal>
    </PageContainer>
  )
}
