import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
      const list = await listScoreEvents(
        classId,
        subjectId || undefined,
      )
      setEvents(list)
    } catch {
      setEvents([])
    }
  }, [classId, subjectId])

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
    <div className="mx-auto w-full max-w-md lg:max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Scores</h1>
        <p className="mt-1 text-sm text-slate-600">
          Record scores by class and subject.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : classes.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-slate-700">
            Register a class before recording scores.
          </p>
          <Link
            to="/classes"
            className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Classes &amp; students
          </Link>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label
              className="block text-sm font-medium text-slate-600"
              htmlFor="scores-class"
            >
              Class
            </label>
            <select
              id="scores-class"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-3 text-slate-900 outline-none ring-secondary focus:ring-2"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {formatClassShiftLabel(c.shift)}
                </option>
              ))}
            </select>

            <label
              className="mt-4 block text-sm font-medium text-slate-600"
              htmlFor="scores-kind"
            >
              Type
            </label>
            <select
              id="scores-kind"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-3 text-slate-900 outline-none ring-secondary focus:ring-2"
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
                <label
                  className="mt-4 block text-sm font-medium text-slate-600"
                  htmlFor="scores-subtype"
                >
                  {kind === SCORE_EVENT_KIND.QUIZ ? 'Quiz type' : 'Exam type'}
                </label>
                <select
                  id="scores-subtype"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-3 text-slate-900 outline-none ring-secondary focus:ring-2"
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

            <label
              className="mt-4 block text-sm font-medium text-slate-600"
              htmlFor="scores-subject"
            >
              Subject
            </label>
            <select
              id="scores-subject"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-3 text-slate-900 outline-none ring-secondary focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
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
            className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">New assessment</h2>

            <label
              className="mt-4 block text-sm font-medium text-slate-600"
              htmlFor="scores-title"
            >
              Title
            </label>
            <input
              id="scores-title"
              type="text"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-3 text-slate-900 outline-none ring-secondary focus:ring-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!subjectId}
            />

            <label
              className="mt-4 block text-sm font-medium text-slate-600"
              htmlFor="scores-date"
            >
              Date
            </label>
            <input
              id="scores-date"
              type="date"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-3 text-slate-900 outline-none ring-secondary focus:ring-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!subjectId}
            />

            <label
              className="mt-4 block text-sm font-medium text-slate-600"
              htmlFor="scores-max"
            >
              Max score (optional)
            </label>
            <input
              id="scores-max"
              type="number"
              min={0}
              step="any"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-3 text-slate-900 outline-none ring-secondary focus:ring-2"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
              disabled={!subjectId}
            />

            {error ? (
              <p className="mt-4 text-sm text-rose-700" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy || !classId || !subjectId}
              className="mt-6 w-full rounded-2xl bg-primary px-4 py-4 font-semibold text-white shadow-md transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Creating…' : 'Create & enter scores'}
            </button>
          </form>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Recent for this class
              {selectedSubject ? ` · ${selectedSubject.subjectName}` : ''}
            </h2>
            {events.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No score events yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {ev.title}
                      </p>
                      <p className="text-sm text-slate-500">
                        {formatScoreEventKindLabel(ev.kind)}
                        {ev.date ? ` · ${ev.date}` : ''}
                        {ev.maxScore !== undefined ? ` · /${ev.maxScore}` : ''}
                      </p>
                    </div>
                    <Link
                      to={`/scores/event/${ev.id}`}
                      className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-primary hover:bg-indigo-50"
                    >
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
