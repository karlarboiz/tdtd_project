import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listClasses } from '../../api/classesApi'
import { listScoreEntries, saveScoreEntries } from '../../api/scoreApi'
import { listStudentsByClass } from '../../api/studentsApi'
import { formatScoreEventKindLabel } from '../../lib/scoreLabels'
import { formatStudentName } from '../../lib/studentDisplay'
import { ApiError } from '../../lib/http'
import type { ClassRow, ScoreEventRow, StudentRow } from '@/types/schema'
import { getScoreEvent } from '../../api/scoreApi'

export function ScoreGrading() {
  const { eventId = '' } = useParams<{ eventId: string }>()
  const navigate = useNavigate()

  const [event, setEvent] = useState<ScoreEventRow | null>(null)
  const [classRow, setClassRow] = useState<ClassRow | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [scores, setScores] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

      const initial: Record<string, string> = {}
      for (const s of roster) {
        const ent = entries.find((e) => e.studentId === s.id)
        initial[s.id] =
          ent?.score !== null && ent?.score !== undefined
            ? String(ent.score)
            : ''
      }
      setScores(initial)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not load score session.',
      )
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  async function handleSave() {
    if (!event) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const entries = students.map((s) => {
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
      await saveScoreEntries(event.id, entries)
      setMessage('Scores saved.')
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
    <div className="mx-auto w-full max-w-md lg:max-w-2xl">
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
      </header>

      {students.length === 0 ? (
        <p className="mt-6 text-center text-slate-600">
          No students in this class. Add students under Classes &amp; students.
        </p>
      ) : (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Enter scores</h2>
          <p className="mt-1 text-sm text-slate-500">
            Leave blank for not yet graded.
          </p>
          <ul className="mt-4 divide-y divide-slate-100">
            {students.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <span className="min-w-0 flex-1 font-medium text-slate-900">
                  {formatStudentName(s)}
                </span>
                <input
                  type="number"
                  min={0}
                  max={event.maxScore}
                  step="any"
                  aria-label={`Score for ${formatStudentName(s)}`}
                  className="w-24 rounded-xl border border-slate-200 bg-neutral-bg px-3 py-2 text-right text-slate-900 outline-none ring-secondary focus:ring-2"
                  value={scores[s.id] ?? ''}
                  onChange={(e) =>
                    setScores((prev) => ({ ...prev, [s.id]: e.target.value }))
                  }
                  placeholder="—"
                />
              </li>
            ))}
          </ul>

          {error ? (
            <p className="mt-4 text-sm text-rose-700" role="alert">
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
            onClick={() => void handleSave()}
            className="mt-6 w-full rounded-2xl bg-primary px-4 py-4 font-semibold text-white shadow-md transition hover:bg-indigo-600 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save scores'}
          </button>
        </section>
      )}
    </div>
  )
}
