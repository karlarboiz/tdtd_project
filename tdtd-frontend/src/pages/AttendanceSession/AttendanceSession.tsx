import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RegisterStudentsModal } from '../../components/RegisterStudentsModal/RegisterStudentsModal'
import { listClasses } from '../../api/classesApi'
import {
  getAttendanceRoster,
  getAttendanceState,
  saveAttendance as saveAttendanceRequest,
  type AttendanceRosterStudent,
} from '../../api/attendanceApi'
import { listStudentsByClass } from '../../api/studentsApi'
import {
  classShiftMatchesPeriod,
  formatClassShiftLabel,
} from '../../lib/classShift'
import { formatStudentName } from '../../lib/studentDisplay'
import type {
  AttendancePeriod,
  AttendanceRecordStatus,
  AttendanceSessionRow,
  ClassRow,
  StudentRow,
} from '@/types/schema'
import { formatLongDate, parseYMD } from '../../lib/dates'
import {
  formInputClasses,
  formLabelClass,
  formLabelInlineClass,
  primaryButtonClass,
} from '@/lib/uiClasses'
import {
  getCurrentPeriod,
  otherAttendancePeriod,
  parseAttendancePeriod,
} from '../../lib/period'

const ATTENDANCE_STATUSES = ['present', 'absent', 'late'] as const

function attendanceStatusLabel(status: AttendanceRecordStatus): string {
  if (status === 'present') return 'Present'
  if (status === 'late') return 'Late'
  return 'Absent'
}

function attendanceStatusClass(status: AttendanceRecordStatus): string {
  if (status === 'present') return 'text-secondary'
  if (status === 'late') return 'text-primary'
  return 'text-slate-600'
}

export function AttendanceSession() {
  const { date: dateParam } = useParams<{ date: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const dateYmd = dateParam ?? ''
  const parsed = parseYMD(dateYmd)
  const isDateValid = parsed !== null
  const periodFromUrl = parseAttendancePeriod(searchParams.get('period'))
  const [resolvedPeriod, setResolvedPeriod] = useState<AttendancePeriod | null>(
    periodFromUrl,
  )
  const [resolvingPeriod, setResolvingPeriod] = useState(
    () => isDateValid && periodFromUrl === null,
  )

  const period = periodFromUrl ?? resolvedPeriod ?? getCurrentPeriod()

  useEffect(() => {
    setResolvedPeriod(periodFromUrl)
    setResolvingPeriod(isDateValid && periodFromUrl === null)
  }, [dateYmd, periodFromUrl, isDateValid])

  useEffect(() => {
    if (!isDateValid || periodFromUrl) return

    let cancelled = false
    void (async () => {
      const current = getCurrentPeriod()
      const other = otherAttendancePeriod(current)
      try {
        const [forCurrent, forOther] = await Promise.all([
          getAttendanceRoster({ date: dateYmd, period: current }),
          getAttendanceRoster({ date: dateYmd, period: other }),
        ])
        if (cancelled) return
        const pick = forCurrent.session
          ? current
          : forOther.session
            ? other
            : current
        setResolvedPeriod(pick)
        setSearchParams({ period: pick }, { replace: true })
      } catch {
        if (cancelled) return
        const fallback = getCurrentPeriod()
        setResolvedPeriod(fallback)
        setSearchParams({ period: fallback }, { replace: true })
      } finally {
        if (!cancelled) setResolvingPeriod(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [dateYmd, isDateValid, periodFromUrl, setSearchParams])

  function setPeriod(next: AttendancePeriod) {
    setSearchParams({ period: next }, { replace: true })
  }

  const [allClasses, setAllClasses] = useState<ClassRow[]>([])
  const [classId, setClassId] = useState('')
  const [students, setStudents] = useState<StudentRow[]>([])
  const [marks, setMarks] = useState<Record<string, AttendanceRecordStatus>>({})
  const [loadingClass, setLoadingClass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [rosterLoading, setRosterLoading] = useState(true)
  const [rosterSession, setRosterSession] = useState<AttendanceSessionRow | null>(
    null,
  )
  const [savedRecords, setSavedRecords] = useState<AttendanceRosterStudent[]>(
    [],
  )
  const didAutoPickClassRef = useRef(false)

  const periodLabel =
    period === 'AM' ? 'Morning Attendance' : 'Afternoon Attendance'

  const refreshClasses = useCallback(async () => {
    const list = await listClasses()
    setAllClasses(list)
  }, [])

  useEffect(() => {
    void refreshClasses()
  }, [refreshClasses])

  useEffect(() => {
    didAutoPickClassRef.current = false
  }, [dateYmd, period])

  const refreshRoster = useCallback(async () => {
    if (!parseYMD(dateYmd) || resolvingPeriod) {
      if (!resolvingPeriod) {
        setRosterSession(null)
        setSavedRecords([])
      }
      setRosterLoading(resolvingPeriod)
      return
    }
    setRosterLoading(true)
    try {
      const data = await getAttendanceRoster({ date: dateYmd, period })
      setRosterSession(data.session)
      setSavedRecords(data.students)
    } catch {
      setRosterSession(null)
      setSavedRecords([])
    } finally {
      setRosterLoading(false)
    }
  }, [dateYmd, period, resolvingPeriod])

  useEffect(() => {
    void refreshRoster()
  }, [refreshRoster])

  const classesForPeriod = useMemo(
    () =>
      allClasses.filter((c) => classShiftMatchesPeriod(c.shift, period)),
    [allClasses, period],
  )

  useEffect(() => {
    setClassId((prev) =>
      prev && classesForPeriod.some((c) => c.id === prev) ? prev : '',
    )
  }, [classesForPeriod])

  useEffect(() => {
    if (didAutoPickClassRef.current || rosterLoading) return
    if (!rosterSession || savedRecords.length === 0) return
    const uniq = [...new Set(savedRecords.map((s) => s.classId))]
    if (uniq.length !== 1) return
    const onlyClassId = uniq[0]
    if (!classesForPeriod.some((c) => c.id === onlyClassId)) return
    setClassId((prev) => (prev ? prev : onlyClassId))
    didAutoPickClassRef.current = true
  }, [rosterLoading, rosterSession, savedRecords, classesForPeriod])

  const loadClassStudents = useCallback(
    async (cid: string) => {
      if (resolvingPeriod) return
      setLoadingClass(true)
      setSaveMsg(null)
      try {
        const list = await listStudentsByClass(cid)
        const ids = list.map((s) => s.id)
        const stored = new Map<string, AttendanceRecordStatus>()
        if (ids.length > 0) {
          const state = await getAttendanceState({
            date: dateYmd,
            period,
            classId: cid,
          })
          for (const mark of state.marks) {
            stored.set(mark.studentId, mark.status)
          }
        }
        const next: Record<string, AttendanceRecordStatus> = {}
        for (const s of list) {
          next[s.id] = stored.get(s.id) ?? 'absent'
        }
        setStudents(list)
        setMarks(next)
      } finally {
        setLoadingClass(false)
      }
    },
    [dateYmd, period, resolvingPeriod],
  )

  useEffect(() => {
    if (!classId || resolvingPeriod) {
      setStudents([])
      setMarks({})
      return
    }
    void loadClassStudents(classId)
  }, [classId, loadClassStudents, resolvingPeriod])

  const allPresent =
    students.length > 0 && students.every((s) => marks[s.id] === 'present')

  function markAll() {
    if (students.length === 0) return
    const nextStatus: AttendanceRecordStatus = allPresent ? 'absent' : 'present'
    setMarks((prev) => {
      const next = { ...prev }
      for (const s of students) next[s.id] = nextStatus
      return next
    })
  }

  function setStudentStatus(studentId: string, status: AttendanceRecordStatus) {
    setMarks((prev) => ({ ...prev, [studentId]: status }))
  }

  async function handleSave() {
    if (!classId || students.length === 0) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const ids = students.map((s) => s.id)
      await saveAttendanceRequest({
        date: dateYmd,
        period,
        classStudentIds: ids,
        marks: ids.map((id) => ({
          studentId: id,
          status: marks[id] ?? 'absent',
        })),
      })
      setSaveMsg('Attendance saved.')
      await refreshRoster()
    } catch {
      setSaveMsg('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleRegisterSaved(createdClassId?: string) {
    void (async () => {
      const list = await listClasses()
      setAllClasses(list)
      if (createdClassId) {
        const match = list.find(
          (c) =>
            c.id === createdClassId &&
            classShiftMatchesPeriod(c.shift, period),
        )
        setClassId(match ? createdClassId : '')
      } else if (classId) {
        await loadClassStudents(classId)
      }
    })()
  }

  if (!parsed) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-slate-700">Invalid date in URL.</p>
        <button
          type="button"
          className="mt-4 rounded-xl bg-primary px-4 py-2 font-semibold text-white"
          onClick={() => navigate('/attendance')}
        >
          Choose a date
        </button>
      </div>
    )
  }

  const hasAnyClasses = allClasses.length > 0
  const hasClassesForPeriod = classesForPeriod.length > 0
  const rosterPanelActive = rosterLoading || Boolean(rosterSession)
  const selectPlaceholder = !hasAnyClasses
    ? 'No class registered yet'
    : !hasClassesForPeriod
      ? `No ${period === 'AM' ? 'morning (MRNG)' : 'afternoon (AFTNN)'} classes`
      : 'Select a class…'

  return (
    <div className="w-full">
      <RegisterStudentsModal
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSaved={handleRegisterSaved}
        existingClasses={allClasses}
      />

      <div className="mx-auto w-full max-w-md lg:max-w-none">
        <div className="mb-6 flex items-center gap-3 lg:mb-8">
          <button
            type="button"
            onClick={() => navigate('/attendance')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Calendar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-start-1 lg:row-start-1">
            <p className="text-sm font-medium text-secondary">{periodLabel}</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">
              {formatLongDate(dateYmd)}
            </h1>
            <div className="mt-4">
              <p className={formLabelInlineClass}>Session period</p>
              <div
                className="mt-2 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-neutral-bg p-1"
                role="group"
                aria-label="Morning or afternoon attendance"
              >
                {(['AM', 'PM'] as const).map((p) => {
                  const active = period === p
                  const label = p === 'AM' ? 'Morning (AM)' : 'Afternoon (PM)'
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={active}
                      disabled={resolvingPeriod}
                      onClick={() => setPeriod(p)}
                      className={[
                        'rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                        active
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-slate-700 hover:bg-white',
                        resolvingPeriod ? 'cursor-wait opacity-60' : '',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Switch between morning and afternoon to view or edit saved attendance
                for each period.
              </p>
            </div>
          </header>

          {rosterPanelActive ? (
            <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:max-h-[min(28rem,calc(100svh-9rem))] lg:overflow-y-auto">
              {rosterLoading ? (
                <p className="text-center text-sm text-slate-500 lg:text-left">
                  Checking for saved attendance…
                </p>
              ) : (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Saved attendance
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Attendance for this date and period is already on file. You can
                    still change the class below to review or update the roster.
                  </p>
                  {savedRecords.length === 0 ? (
                    <p className="mt-4 text-center text-slate-600">
                      No attendance records for this session yet.
                    </p>
                  ) : (
                    <ul className="mt-4 divide-y divide-slate-100">
                      {savedRecords.map((s) => {
                        const cls = allClasses.find((c) => c.id === s.classId)
                        return (
                          <li
                            key={s.id}
                            className="flex flex-wrap items-baseline justify-between gap-2 py-3"
                          >
                            <span className="text-slate-900">
                              {formatStudentName(s)}
                            </span>
                            <span className="flex flex-wrap items-baseline justify-end gap-2">
                              {cls ? (
                                <span className="text-sm text-slate-500">
                                  {cls.name} · {formatClassShiftLabel(cls.shift)}
                                </span>
                              ) : null}
                              <span
                                className={`text-sm font-semibold ${attendanceStatusClass(s.status)}`}
                              >
                                {attendanceStatusLabel(s.status)}
                              </span>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              )}
            </div>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-start-1 lg:row-start-2 lg:min-w-0">
            <label className={formLabelClass} htmlFor="class-select">
              Class
            </label>
            <select
              id="class-select"
              className={`mt-2 py-3 ${formInputClasses()}`}
              value={hasClassesForPeriod ? classId : ''}
              onChange={(e) => setClassId(e.target.value)}
              disabled={!hasClassesForPeriod}
            >
              <option value="">{selectPlaceholder}</option>
              {hasClassesForPeriod &&
                classesForPeriod.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {formatClassShiftLabel(c.shift)}
                  </option>
                ))}
            </select>

            <p className="mt-2 text-sm text-slate-500">
              {!hasAnyClasses
                ? 'Set up your roster first — register a class (with morning or afternoon schedule) and add students.'
                : !hasClassesForPeriod
                  ? `Only classes scheduled for ${period === 'AM' ? 'morning (MRNG)' : 'afternoon (AFTNN)'} appear during ${period === 'AM' ? 'morning' : 'afternoon'} attendance. Manage all classes under Classes & Students.`
                  : 'Choose a class to load its student list.'}
            </p>

            <button
              type="button"
              onClick={() => setRegisterModalOpen(true)}
              className="mt-4 w-full rounded-2xl border-2 border-primary bg-indigo-50/80 px-4 py-4 text-center font-semibold text-primary shadow-sm transition hover:bg-indigo-100"
            >
              Register Students or import from Excel
              <span className="mt-1 block text-sm font-normal text-indigo-900/80">
                Opens a setup window — manual entry or spreadsheet import
              </span>
            </button>
          </section>

          {hasClassesForPeriod && classId ? (
            <section
              className={[
                'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:min-h-0 lg:min-w-0 lg:max-h-[calc(100svh-9rem)] lg:overflow-y-auto',
                rosterPanelActive
                  ? 'lg:col-start-2 lg:row-start-2'
                  : 'lg:col-start-2 lg:row-start-1 lg:row-span-2',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-semibold text-slate-900">Students</h2>
                <button
                  type="button"
                  onClick={markAll}
                  disabled={students.length === 0 || loadingClass}
                  className="min-h-11 touch-manipulation rounded-lg bg-secondary/15 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-secondary/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {allPresent ? 'Mark all absent' : 'Mark all present'}
                </button>
              </div>

              {loadingClass ? (
                <p className="py-8 text-center text-slate-500">Loading…</p>
              ) : students.length === 0 ? (
                <p className="py-8 text-center text-slate-600">
                  No students in this class yet. Use &quot;Register Students or
                  import from Excel&quot; above to add names.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {students.map((s) => {
                    const current = marks[s.id] ?? 'absent'
                    return (
                      <li key={s.id} className="py-3">
                        <p className="text-slate-900" id={`stu-${s.id}`}>
                          {formatStudentName(s)}
                        </p>
                        <div
                          className="mt-2 grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-neutral-bg p-1"
                          role="group"
                          aria-labelledby={`stu-${s.id}`}
                        >
                          {ATTENDANCE_STATUSES.map((status) => {
                            const active = current === status
                            const activeClass =
                              status === 'present'
                                ? 'bg-primary text-white shadow-sm'
                                : status === 'late'
                                  ? 'bg-secondary text-white shadow-sm'
                                  : 'bg-white text-slate-900 shadow-sm'
                            return (
                              <button
                                key={status}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setStudentStatus(s.id, status)}
                                className={[
                                  'min-h-11 touch-manipulation rounded-lg px-2 py-2 text-sm font-semibold transition',
                                  active
                                    ? activeClass
                                    : 'text-slate-600 hover:bg-white',
                                ].join(' ')}
                              >
                                {attendanceStatusLabel(status)}
                              </button>
                            )
                          })}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={
                  saving || !classId || students.length === 0 || loadingClass
                }
                className={`mt-6 w-full rounded-xl py-3 text-lg ${primaryButtonClass}`}
              >
                {saving ? 'Saving…' : 'Save attendance'}
              </button>
              {saveMsg ? (
                <p
                  className={`mt-3 text-center text-sm font-medium ${
                    saveMsg.startsWith('Could') ? 'text-accent' : 'text-secondary'
                  }`}
                >
                  {saveMsg}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
