import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '@/layouts/PageContainer'
import { getActiveSchoolYear } from '../../api/schoolYearApi'
import { getStudentLab, type StudentLabQuery } from '../../api/studentLabApi'
import { attendanceSessionPath } from '../../lib/attendanceSessionRoute'
import { formatClassShiftLabel } from '../../lib/classShift'
import { formatLongDate } from '../../lib/dates'
import { formatScoreEventKindLabel } from '../../lib/scoreLabels'
import { formatStudentName } from '../../lib/studentDisplay'
import {
  calendarYearRange,
  lastNDaysRange,
} from '../../lib/studentLabDates'
import { ApiError } from '../../lib/http'
import { errorAlertClass, formLabelInlineClass } from '@/lib/uiClasses'
import type {
  SchoolYearRow,
  StudentLabPayload,
  StudentLabScoreRow,
} from '@/types/schema'

type AttendanceRangeMode = '30' | 'all'
type ScoreRangePreset = '30' | '90' | 'sy'

function genderLabel(code: string): string {
  if (code === 'M') return 'Male'
  if (code === 'F') return 'Female'
  if (code === 'O') return 'Other'
  return code
}

function buildQuery(
  attendanceMode: AttendanceRangeMode,
  scorePreset: ScoreRangePreset,
  schoolYear: SchoolYearRow | null,
): StudentLabQuery {
  const attendance =
    attendanceMode === '30' ? lastNDaysRange(30) : {}

  let scoresRange = lastNDaysRange(30)
  if (scorePreset === '90') {
    scoresRange = lastNDaysRange(90)
  } else if (scorePreset === 'sy') {
    if (schoolYear?.startDate && schoolYear?.endDate) {
      scoresRange = {
        from: schoolYear.startDate,
        to: schoolYear.endDate,
      }
    } else {
      scoresRange = calendarYearRange()
    }
  }

  return {
    ...attendance,
    scoresFrom: scoresRange.from,
    scoresTo: scoresRange.to,
  }
}

function ScoreList({
  title,
  rows,
}: {
  title: string
  rows: StudentLabScoreRow[]
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No scores in this range.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {rows.map((row) => (
            <li key={row.eventId}>
              <Link
                to={`/scores/event/${encodeURIComponent(row.eventId)}`}
                className="flex min-h-11 flex-col gap-0.5 px-3 py-3 transition hover:bg-slate-50 active:bg-slate-100 sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="font-medium text-slate-900">{row.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {row.subjectName}
                    {row.date ? ` · ${row.date}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-secondary">
                  {row.maxScore != null
                    ? `${row.score} / ${row.maxScore}`
                    : String(row.score)}
                  <span className="ml-2 font-normal text-slate-400">›</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function StudentLab() {
  const { studentId = '' } = useParams<{ studentId: string }>()
  const [data, setData] = useState<StudentLabPayload | null>(null)
  const [schoolYear, setSchoolYear] = useState<SchoolYearRow | null>(null)
  const [attendanceMode, setAttendanceMode] = useState<AttendanceRangeMode>('30')
  const [scorePreset, setScorePreset] = useState<ScoreRangePreset>('30')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const year = await getActiveSchoolYear()
        setSchoolYear(year)
      } catch {
        setSchoolYear(null)
      }
    })()
  }, [])

  const query = useMemo(
    () => buildQuery(attendanceMode, scorePreset, schoolYear),
    [attendanceMode, scorePreset, schoolYear],
  )

  const loadLab = useCallback(async () => {
    if (!studentId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const payload = await getStudentLab(studentId, query)
      setData(payload)
    } catch (err) {
      setData(null)
      setError(
        err instanceof ApiError ? err.message : 'Could not load student lab.',
      )
    } finally {
      setLoading(false)
    }
  }, [studentId, query])

  useEffect(() => {
    void loadLab()
  }, [loadLab])

  const profile = data?.profile
  const attendance = data?.attendance
  const scores = data?.scores

  const scorePresetLabel = useMemo(() => {
    if (scorePreset === '30') return 'Last 30 days'
    if (scorePreset === '90') return 'Last 90 days'
    return schoolYear?.label
      ? `School year ${schoolYear.label}`
      : 'This school year'
  }, [scorePreset, schoolYear?.label])

  if (!studentId) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-slate-700">Missing student in URL.</p>
        <Link
          to="/student-lab"
          className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 font-semibold text-white"
        >
          Student Lab
        </Link>
      </div>
    )
  }

  if (loading && !data) {
    return <p className="text-sm text-slate-500">Loading student lab…</p>
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-slate-700">{error ?? 'Student not found.'}</p>
        <Link
          to="/student-lab"
          className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 font-semibold text-white"
        >
          Back to Student Lab
        </Link>
      </div>
    )
  }

  const { student, class: classRow } = profile

  return (
    <PageContainer variant="wide" className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          to="/student-lab"
          className="font-semibold text-secondary hover:underline"
        >
          ← Student Lab
        </Link>
        <span className="text-slate-300" aria-hidden>
          |
        </span>
        <Link
          to="/classes"
          className="font-semibold text-slate-600 hover:underline"
        >
          Classes
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {formatStudentName(student)}
        </h1>
        <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-500">Birth date</dt>
            <dd>{student.birthDate}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Gender</dt>
            <dd>{genderLabel(student.gender)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-slate-500">Class</dt>
            <dd>
              {classRow.name} · {formatClassShiftLabel(classRow.shift)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Attendance</h2>
          <div
            className="inline-flex w-full rounded-xl border border-slate-200 p-0.5 sm:w-auto"
            role="group"
            aria-label="Attendance date range"
          >
            <button
              type="button"
              className={[
                'touch-manipulation flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition sm:flex-none',
                attendanceMode === '30'
                  ? 'bg-primary text-white'
                  : 'text-slate-700 hover:bg-slate-50',
              ].join(' ')}
              onClick={() => setAttendanceMode('30')}
            >
              Last 30 days
            </button>
            <button
              type="button"
              className={[
                'touch-manipulation flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition sm:flex-none',
                attendanceMode === 'all'
                  ? 'bg-primary text-white'
                  : 'text-slate-700 hover:bg-slate-50',
              ].join(' ')}
              onClick={() => setAttendanceMode('all')}
            >
              All time
            </button>
          </div>
        </div>

        {attendance ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                <p className="text-xs font-medium text-slate-500">Present</p>
                <p className="text-xl font-bold text-secondary">
                  {attendance.summary.presentCount}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                <p className="text-xs font-medium text-slate-500">Absent</p>
                <p className="text-xl font-bold text-slate-800">
                  {attendance.summary.absentCount}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                <p className="text-xs font-medium text-slate-500">Sessions</p>
                <p className="text-xl font-bold text-slate-900">
                  {attendance.summary.totalSessions}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
                <p className="text-xs font-medium text-slate-500">Rate</p>
                <p className="text-xl font-bold text-slate-900">
                  {attendance.summary.presentRate}%
                </p>
              </div>
            </div>

            <ul className="mt-4 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100">
              {attendance.sessions.map((sess) => (
                <li key={`${sess.date}-${sess.period}`}>
                  <Link
                    to={attendanceSessionPath(sess.date, sess.period)}
                    className="flex min-h-11 items-center justify-between px-3 py-3 hover:bg-slate-50 active:bg-slate-100"
                  >
                    <span className="text-sm text-slate-800">
                      {formatLongDate(sess.date)} · {sess.period}
                    </span>
                    <span
                      className={[
                        'text-sm font-semibold',
                        sess.status === 'present'
                          ? 'text-secondary'
                          : 'text-slate-700',
                      ].join(' ')}
                    >
                      {sess.status === 'present' ? 'Present' : 'Absent'}
                      <span className="ml-2 font-normal text-slate-400">›</span>
                    </span>
                  </Link>
                </li>
              ))}
              {attendance.sessions.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-slate-500">
                  No sessions in this range.
                </li>
              )}
            </ul>
          </>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent scores</h2>
          <label className="flex w-full min-w-0 flex-col gap-1 text-sm sm:w-auto sm:flex-row sm:items-center sm:gap-2">
            <span className={`shrink-0 ${formLabelInlineClass}`}>Range</span>
            <select
              value={scorePreset}
              onChange={(e) =>
                setScorePreset(e.target.value as ScoreRangePreset)
              }
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-neutral-bg px-2 py-2 outline-none ring-secondary focus:ring-2 sm:w-auto"
              aria-label="Score date range"
            >
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="sy">
                {schoolYear?.label
                  ? `School year ${schoolYear.label}`
                  : 'This school year'}
              </option>
            </select>
          </label>
        </div>
        <p className="mt-1 text-xs text-slate-500">{scorePresetLabel}</p>

        {scores ? (
          <div className="mt-6 space-y-6">
            <ScoreList
              title={formatScoreEventKindLabel('QUIZ')}
              rows={scores.recentQuizzes}
            />
            <ScoreList
              title={formatScoreEventKindLabel('EXAM')}
              rows={scores.recentExams}
            />
            <ScoreList
              title={formatScoreEventKindLabel('PARTICIPATION')}
              rows={scores.recentParticipation}
            />
          </div>
        ) : null}
      </section>

      {loading ? (
        <p className="text-center text-xs text-slate-400">Refreshing…</p>
      ) : null}
      {error && data ? (
        <p className={`text-center ${errorAlertClass}`} role="alert">
          {error}
        </p>
      ) : null}
    </PageContainer>
  )
}
