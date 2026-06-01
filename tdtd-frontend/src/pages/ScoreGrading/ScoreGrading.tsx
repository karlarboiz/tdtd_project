import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageContainer } from '@/layouts/PageContainer'
import { listClasses } from '../../api/classesApi'
import {
  getScoreEvent,
  listScoreEntries,
  saveScoreEntries,
} from '../../api/scoreApi'
import { listStudentsByClass } from '../../api/studentsApi'
import { formatRecordedAt } from '../../lib/dates'
import { formatScoreEventKindLabel } from '../../lib/scoreLabels'
import { formatStudentName } from '../../lib/studentDisplay'
import { ApiError } from '../../lib/http'
import {
  errorAlertClass,
  formInputClasses,
  formLabelClass,
  primaryButtonClass,
} from '@/lib/uiClasses'
import type {
  ClassRow,
  ScoreEntryRow,
  ScoreEventRow,
  StudentRow,
} from '@/types/schema'

type SavedEntry = {
  score: number | null
  recordedAt: number
}

function hasSavedScore(entries: ScoreEntryRow[]): boolean {
  return entries.some((e) => e.score !== null && e.score !== undefined)
}

function applyEntriesToState(
  entries: ScoreEntryRow[],
  roster: StudentRow[],
): {
  saved: Record<string, SavedEntry>
  draft: Record<string, string>
} {
  const saved: Record<string, SavedEntry> = {}
  const draft: Record<string, string> = {}
  for (const s of roster) {
    const ent = entries.find((e) => e.studentId === s.id)
    if (ent) {
      saved[s.id] = { score: ent.score, recordedAt: ent.recordedAt }
      draft[s.id] =
        ent.score !== null && ent.score !== undefined ? String(ent.score) : ''
    } else {
      draft[s.id] = ''
    }
  }
  return { saved, draft }
}

export function ScoreGrading() {
  const { eventId = '' } = useParams<{ eventId: string }>()
  const navigate = useNavigate()

  const [event, setEvent] = useState<ScoreEventRow | null>(null)
  const [classRow, setClassRow] = useState<ClassRow | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [savedEntries, setSavedEntries] = useState<Record<string, SavedEntry>>(
    {},
  )
  const [scores, setScores] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const lastRecordedAt = useMemo(() => {
    const times = Object.values(savedEntries)
      .filter((e) => e.score !== null && e.score !== undefined)
      .map((e) => e.recordedAt)
    if (times.length === 0) return null
    return Math.max(...times)
  }, [savedEntries])

  const syncFromEntries = useCallback(
    (entries: ScoreEntryRow[], roster: StudentRow[], editing?: boolean) => {
      const { saved, draft } = applyEntriesToState(entries, roster)
      setSavedEntries(saved)
      setScores(draft)
      if (editing !== undefined) {
        setIsEditing(editing)
      } else {
        setIsEditing(!hasSavedScore(entries))
      }
    },
    [],
  )

  const loadPage = useCallback(async () => {
    if (!eventId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [ev, classes] = await Promise.all([
        getScoreEvent(eventId),
        listClasses(),
      ])
      setEvent(ev)
      setClassRow(classes.find((c) => c.id === ev.classId) ?? null)

      const [roster, entries] = await Promise.all([
        listStudentsByClass(ev.classId),
        listScoreEntries(eventId),
      ])
      setStudents(roster)
      syncFromEntries(entries, roster)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not load score session.',
      )
    } finally {
      setLoading(false)
    }
  }, [eventId, syncFromEntries])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  function startEditing() {
    const draft: Record<string, string> = {}
    for (const s of students) {
      const ent = savedEntries[s.id]
      draft[s.id] =
        ent?.score !== null && ent?.score !== undefined
          ? String(ent.score)
          : ''
    }
    setScores(draft)
    setIsEditing(true)
    setMessage(null)
    setError(null)
  }

  async function handleSave() {
    if (!event) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const payload = students.map((s) => {
        const raw = scores[s.id]?.trim() ?? ''
        let score: number | null = null
        if (raw !== '') {
          const n = Number(raw)
          if (Number.isNaN(n)) {
            throw new Error(`Invalid score for ${formatStudentName(s)}`)
          }
          score = n
        }
        return { studentId: s.id, score }
      })
      const updated = await saveScoreEntries(event.id, payload)
      syncFromEntries(updated, students, false)
      setMessage('Scores saved. Check Recents for this activity.')
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not save scores.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (!eventId) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-slate-700">Missing event in URL.</p>
        <button
          type="button"
          className="mt-4 rounded-xl bg-primary px-4 py-2 font-semibold text-white"
          onClick={() => navigate('/scores')}
        >
          Back to scores
        </button>
      </div>
    )
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading score sheet…</p>
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-slate-700">{error ?? 'Event not found.'}</p>
        <button
          type="button"
          className="mt-4 rounded-xl bg-primary px-4 py-2 font-semibold text-white"
          onClick={() => navigate('/scores')}
        >
          Back to scores
        </button>
      </div>
    )
  }

  return (
    <PageContainer>
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/scores')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Scores
        </button>
      </div>

      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-secondary">
          {formatScoreEventKindLabel(event.kind)}
          {classRow ? ` · ${classRow.name}` : ''}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">{event.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {event.date ? `Date: ${event.date}` : 'No date set'}
          {event.maxScore !== undefined ? ` · Max: ${event.maxScore}` : ''}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {lastRecordedAt !== null
            ? `Scores last recorded: ${formatRecordedAt(lastRecordedAt)}`
            : 'Scores not recorded yet'}
        </p>
      </header>

      {students.length === 0 ? (
        <p className="mt-6 text-center text-slate-600">
          No students in this class. Add students under Classes &amp; Students.
        </p>
      ) : (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditing ? 'Enter scores' : 'Scores'}
          </h2>
          {isEditing ? (
            <p className="mt-1 text-sm text-slate-500">
              Leave blank for not yet graded.
            </p>
          ) : null}

          <ul className="mt-4 divide-y divide-slate-100">
            {students.map((s) => {
              const saved = savedEntries[s.id]
              const hasScore =
                saved?.score !== null && saved?.score !== undefined

              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <span className="min-w-0 flex-1 font-medium text-slate-900">
                    {formatStudentName(s)}
                  </span>

                  {isEditing ? (
                    <input
                      type="number"
                      min={0}
                      max={event.maxScore}
                      step="any"
                      aria-label={`Score for ${formatStudentName(s)}`}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-neutral-bg px-3 py-2 text-right text-slate-900 outline-none ring-secondary focus:ring-2 sm:w-24"
                      value={scores[s.id] ?? ''}
                      onChange={(e) =>
                        setScores((prev) => ({
                          ...prev,
                          [s.id]: e.target.value,
                        }))
                      }
                      placeholder="—"
                    />
                  ) : (
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums text-slate-900">
                        {hasScore ? String(saved.score) : '—'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {hasScore
                          ? `Recorded: ${formatRecordedAt(saved.recordedAt)}`
                          : 'Not recorded'}
                      </p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {error ? (
            <p className={`mt-4 ${errorAlertClass}`} role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-4 text-sm text-teal-700" role="status">
              {message}
            </p>
          ) : null}

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              isEditing ? void handleSave() : startEditing()
            }
            className={`mt-6 w-full rounded-2xl px-4 py-4 ${primaryButtonClass}`}
          >
            {saving
              ? 'Saving…'
              : isEditing
                ? 'Save Changes'
                : 'Edit Changes'}
          </button>
        </section>
      )}
    </PageContainer>
  )
}
