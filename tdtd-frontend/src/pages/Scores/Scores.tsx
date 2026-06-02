import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ContentReveal } from '@/components/ContentReveal/ContentReveal'
import { ScoresPageSkeleton } from '@/components/LoadingSkeleton/ScoresPageSkeleton'
import { PageContainer } from '@/layouts/PageContainer'
import { PageContentReveal } from '@/layouts/PageContentReveal'
import { listClasses } from '../../api/classesApi'
import {
  getActiveSchoolYear,
  listSchoolYearSubjects,
} from '../../api/schoolYearApi'
import {
  assignSubjectToClass,
  createScoreEvent,
  listClassSubjects,
  listScoreEvents,
} from '../../api/scoreApi'
import {
  SCORE_EVENT_KIND,
  type ScoreEventKindValue,
} from '@/constants/TDTDConstants'
import { formatClassShiftLabel } from '../../lib/classShift'
import { ApiError } from '../../lib/http'
import {
  buildScoreEventTitle,
  formatScoreEventKindLabel,
  subtypeOptionsForKind,
} from '../../lib/scoreLabels'
import {
  errorAlertClass,
  formInputClasses,
  formLabelClass,
  primaryButtonClass,
} from '@/lib/uiClasses'
import type { ClassRow, SchoolYearSubjectRow, ScoreEventRow } from '@/types/schema'

function todayYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function Scores() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [classId, setClassId] = useState('')
  const [yearSubjects, setYearSubjects] = useState<SchoolYearSubjectRow[]>([])
  const [events, setEvents] = useState<ScoreEventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [kind, setKind] = useState<ScoreEventKindValue>(SCORE_EVENT_KIND.QUIZ)
  const [subtypeCode, setSubtypeCode] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayYmd())
  const [maxScore, setMaxScore] = useState('')

  const subtypeOptions = useMemo(() => subtypeOptionsForKind(kind), [kind])

  /** One option per catalog subject (first registration wins for label). */
  const subjectOptions = useMemo(() => {
    const byId = new Map<string, SchoolYearSubjectRow>()
    for (const ys of yearSubjects) {
      if (!byId.has(ys.subjectId)) byId.set(ys.subjectId, ys)
    }
    return [...byId.values()].sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName),
    )
  }, [yearSubjects])

  const selectedSubject = subjectOptions.find((s) => s.subjectId === subjectId)

  const selectedClass = classes.find((c) => c.id === classId)

  const subjectNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const ys of yearSubjects) {
      if (!map.has(ys.subjectId)) map.set(ys.subjectId, ys.subjectName)
    }
    return map
  }, [yearSubjects])

  const refreshClasses = useCallback(async () => {
    const list = await listClasses()
    setClasses(list)
    setClassId((prev) => {
      if (prev && list.some((c) => c.id === prev)) return prev
      return list[0]?.id ?? ''
    })
  }, [])

  const refreshYearSubjects = useCallback(async () => {
    try {
      const year = await getActiveSchoolYear()
      const list = await listSchoolYearSubjects(year.id)
      setYearSubjects(list)
      setSubjectId((prev) =>
        prev && list.some((s) => s.subjectId === prev)
          ? prev
          : (list[0]?.subjectId ?? ''),
      )
    } catch {
      setYearSubjects([])
      setSubjectId('')
    }
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        await Promise.all([refreshClasses(), refreshYearSubjects()])
      } finally {
        setLoading(false)
      }
    })()
  }, [refreshClasses, refreshYearSubjects])

  useEffect(() => {
    const opts = subtypeOptionsForKind(kind)
    setSubtypeCode((prev) =>
      prev && opts.some((o) => o.code === prev) ? prev : (opts[0]?.code ?? ''),
    )
  }, [kind])

  useEffect(() => {
    if (!selectedSubject) return
    setTitle(
      buildScoreEventTitle(
        kind,
        subtypeCode || undefined,
        selectedSubject.subjectName,
      ),
    )
  }, [kind, subtypeCode, selectedSubject])

  const refreshEvents = useCallback(async () => {
    if (!classId) {
      setEvents([])
      return
    }
    try {
      setEvents(await listScoreEvents(classId))
    } catch {
      setEvents([])
    }
  }, [classId])

  useEffect(() => {
    void refreshEvents()
  }, [refreshEvents])

  async function ensureSubjectAssignedToClass(
    cid: string,
    sid: string,
  ): Promise<void> {
    const assigned = await listClassSubjects(cid)
    if (assigned.some((s) => s.subjectId === sid)) return
    await assignSubjectToClass(cid, sid)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!classId || !subjectId) {
      setError('Select a class and subject.')
      return
    }
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Title is required.')
      return
    }
    let max: number | undefined
    if (maxScore.trim()) {
      const n = Number(maxScore)
      if (Number.isNaN(n) || n < 0) {
        setError('Max score must be a non-negative number.')
        return
      }
      max = n
    }
    setBusy(true)
    try {
      await ensureSubjectAssignedToClass(classId, subjectId)
      const created = await createScoreEvent(classId, {
        subjectId,
        kind,
        title: trimmedTitle,
        date: date.trim() || undefined,
        maxScore: max,
      })
      navigate(`/scores/event/${created.id}`)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not create score event.',
      )
    } finally {
      setBusy(false)
    }
  }

  const subjectSelectDisabled = !classId || subjectOptions.length === 0

  return (
    <PageContainer variant="wide">
      <PageContentReveal>
      <header className="mb-6 lg:mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Scores</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Record scores by class and subject. Create an assessment on the left;
          open recent quizzes, exams, and participation on the right.
        </p>
      </header>

      {loading ? (
        <ScoresPageSkeleton />
      ) : classes.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-slate-700">
            Register a class before recording scores.
          </p>
          <Link
            to="/classes"
            className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Classes &amp; Students
          </Link>
        </section>
      ) : (
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          <div className="flex flex-col gap-6 lg:col-span-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className={formLabelClass} htmlFor="scores-class">
              Class
            </label>
            <select
              id="scores-class"
              className={`mt-2 py-3 ${formInputClasses()}`}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {formatClassShiftLabel(c.shift)}
                </option>
              ))}
            </select>

            <label className={`mt-4 ${formLabelClass}`} htmlFor="scores-kind">
              Type
            </label>
            <select
              id="scores-kind"
              className={`mt-2 py-3 ${formInputClasses()}`}
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as ScoreEventKindValue)
              }
            >
              {(
                Object.values(SCORE_EVENT_KIND) as ScoreEventKindValue[]
              ).map((k) => (
                <option key={k} value={k}>
                  {formatScoreEventKindLabel(k)}
                </option>
              ))}
            </select>

            {subtypeOptions.length > 0 ? (
              <>
                <label className={`mt-4 ${formLabelClass}`} htmlFor="scores-subtype">
                  {kind === SCORE_EVENT_KIND.QUIZ ? 'Quiz type' : 'Exam type'}
                </label>
                <select
                  id="scores-subtype"
                  className={`mt-2 py-3 ${formInputClasses()}`}
                  value={subtypeCode}
                  onChange={(e) => setSubtypeCode(e.target.value)}
                >
                  {subtypeOptions.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label} ({o.code})
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            <label className={`mt-4 ${formLabelClass}`} htmlFor="scores-subject">
              Subject
            </label>
            <select
              id="scores-subject"
              className={`mt-2 py-3 ${formInputClasses()}`}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={subjectSelectDisabled}
            >
              {!classId ? (
                <option value="">Select a class first</option>
              ) : subjectOptions.length === 0 ? (
                <option value="">No subjects for this school year</option>
              ) : (
                <>
                  <option value="">Choose a subject…</option>
                  {subjectOptions.map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>
                      {s.subjectName}
                      {s.subjectShortCode ? ` (${s.subjectShortCode})` : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
            {classId && subjectOptions.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">
                Add subjects for the active school year on the{' '}
                <Link to="/subjects" className="font-medium text-primary hover:underline">
                  Subjects
                </Link>{' '}
                page.
              </p>
            ) : classId && subjectId ? (
              <p className="mt-2 text-xs text-slate-500">
                This subject is linked to the class automatically when you create
                an assessment.
              </p>
            ) : null}
          </section>

          <form
            onSubmit={(e) => void handleCreate(e)}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">New assessment</h2>

            <label className={`mt-4 ${formLabelClass}`} htmlFor="scores-title">
              Title
            </label>
            <input
              id="scores-title"
              type="text"
              className={`mt-2 py-3 ${formInputClasses({ error: Boolean(error) })}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!subjectId}
              aria-invalid={Boolean(error)}
            />

            <label className={`mt-4 ${formLabelClass}`} htmlFor="scores-date">
              Date
            </label>
            <input
              id="scores-date"
              type="date"
              className={`mt-2 py-3 ${formInputClasses()}`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!subjectId}
            />

            <label className={`mt-4 ${formLabelClass}`} htmlFor="scores-max">
              Max score (optional)
            </label>
            <input
              id="scores-max"
              type="number"
              min={0}
              step="any"
              className={`mt-2 py-3 ${formInputClasses()}`}
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              disabled={!subjectId}
            />

            {error ? (
              <p className={`mt-4 ${errorAlertClass}`} role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy || !classId || !subjectId}
              className={`mt-6 w-full rounded-2xl px-4 py-4 ${primaryButtonClass}`}
            >
              {busy ? 'Creating…' : 'Create & enter scores'}
            </button>
          </form>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7 lg:flex lg:min-h-0 lg:max-h-[calc(100svh-10rem)] lg:flex-col lg:self-start">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent assessments
              {selectedClass ? (
                <span className="font-normal text-slate-600">
                  {' '}
                  · {selectedClass.name}
                </span>
              ) : null}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Quizzes, exams, and participation for the selected class.
            </p>
            {!classId ? (
              <p className="mt-4 text-sm text-slate-500">Select a class to see assessments.</p>
            ) : events.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No assessments yet. Create one on the left.
              </p>
            ) : (
              <ContentReveal revealKey={classId}>
              <ul className="mt-4 min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto lg:max-h-[calc(100svh-14rem)]">
                {events.map((ev) => {
                  const subjectLabel =
                    subjectNameById.get(ev.subjectId) ?? 'Subject'
                  return (
                    <li
                      key={ev.id}
                      className="flex flex-col gap-3 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 sm:truncate">
                          {ev.title}
                        </p>
                        <p className="text-sm text-slate-500">
                          <span className="font-medium text-slate-600">
                            {formatScoreEventKindLabel(ev.kind)}
                          </span>
                          {' · '}
                          {subjectLabel}
                          {ev.date ? ` · ${ev.date}` : ''}
                          {ev.maxScore !== undefined ? ` · /${ev.maxScore}` : ''}
                        </p>
                      </div>
                      <Link
                        to={`/scores/event/${ev.id}`}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-primary hover:bg-indigo-50 sm:self-auto"
                      >
                        Open
                      </Link>
                    </li>
                  )
                })}
              </ul>
              </ContentReveal>
            )}
          </section>
        </div>
      )}
      </PageContentReveal>
    </PageContainer>
  )
}
