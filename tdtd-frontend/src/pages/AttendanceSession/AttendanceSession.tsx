import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ListRowsSkeleton } from '@/components/LoadingSkeleton/ListRowsSkeleton'
import { ScoreRosterSkeleton } from '@/components/LoadingSkeleton/ScoreRosterSkeleton'
import { SkeletonBar } from '@/components/LoadingSkeleton/SkeletonBar'
import { SkeletonStatus } from '@/components/LoadingSkeleton/SkeletonStatus'
import { PageContainer } from '@/layouts/PageContainer'
import { PageContentReveal } from '@/layouts/PageContentReveal'
import { RegisterStudentsModal } from '../../components/RegisterStudentsModal/RegisterStudentsModal'
import { listClasses } from '../../api/classesApi'
import {
  getAttendancePresentRoster,
  getAttendanceState,
  saveAttendance as saveAttendanceRequest,
} from '../../api/attendanceApi'
import { listStudentsByClass } from '../../api/studentsApi'
import {
  classShiftMatchesPeriod,
  formatClassShiftLabel,
} from '../../lib/classShift'
import { formatStudentName } from '../../lib/studentDisplay'
import type {
  AttendancePeriod,
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
          getAttendancePresentRoster({ date: dateYmd, period: current }),
          getAttendancePresentRoster({ date: dateYmd, period: other }),
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
  const [present, setPresent] = useState<Record<string, boolean>>({})
  const [loadingClass, setLoadingClass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [rosterLoading, setRosterLoading] = useState(true)
  const [rosterSession, setRosterSession] = useState<AttendanceSessionRow | null>(
    null,
  )
  const [savedPresentStudents, setSavedPresentStudents] = useState<
    StudentRow[]
  >([])
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

  const refreshPresentRoster = useCallback(async () => {
    if (!parseYMD(dateYmd) || resolvingPeriod) {
      if (!resolvingPeriod) {
        setRosterSession(null)
        setSavedPresentStudents([])
      }
      setRosterLoading(resolvingPeriod)
      return
    }
    setRosterLoading(true)
    try {
      const data = await getAttendancePresentRoster({ date: dateYmd, period })
      setRosterSession(data.session)
      setSavedPresentStudents(data.presentStudents)
    } catch {
      setRosterSession(null)
      setSavedPresentStudents([])
    } finally {
      setRosterLoading(false)
    }
  }, [dateYmd, period, resolvingPeriod])

  useEffect(() => {
    void refreshPresentRoster()
  }, [refreshPresentRoster])

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
    if (!rosterSession || savedPresentStudents.length === 0) return
    const uniq = [...new Set(savedPresentStudents.map((s) => s.classId))]
    if (uniq.length !== 1) return
    const onlyClassId = uniq[0]
    if (!classesForPeriod.some((c) => c.id === onlyClassId)) return
    setClassId((prev) => (prev ? prev : onlyClassId))
    didAutoPickClassRef.current = true
  }, [rosterLoading, rosterSession, savedPresentStudents, classesForPeriod])

  const loadClassStudents = useCallback(
    async (cid: string) => {
      if (resolvingPeriod) return
      setLoadingClass(true)
      setSaveMsg(null)
      try {
        const list = await listStudentsByClass(cid)
        const ids = list.map((s) => s.id)
        let presentSet = new Set<string>()
        if (ids.length > 0) {
          const state = await getAttendanceState({
            date: dateYmd,
            period,
            classId: cid,
          })
          presentSet = new Set(state.presentStudentIds)
        }
        const next: Record<string, boolean> = {}
        for (const s of list) {
          next[s.id] = presentSet.has(s.id)
        }
        setStudents(list)
        setPresent(next)
      } finally {
        setLoadingClass(false)
      }
    },
    [dateYmd, period, resolvingPeriod],
  )

  useEffect(() => {
    if (!classId || resolvingPeriod) {
      setStudents([])
      setPresent({})
      return
    }
    void loadClassStudents(classId)
  }, [classId, loadClassStudents, resolvingPeriod])

  const allChecked =
    students.length > 0 && students.every((s) => present[s.id])

  function toggleSelectAll() {
    if (students.length === 0) return
    const turnOn = !allChecked
    setPresent((prev) => {
      const next = { ...prev }
      for (const s of students) next[s.id] = turnOn
      return next
    })
  }

  function toggleOne(studentId: string) {
    setPresent((prev) => ({ ...prev, [studentId]: !prev[studentId] }))
  }

  async function handleSave() {
    if (!classId || students.length === 0) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const ids = students.map((s) => s.id)
      const presentIds = ids.filter((id) => present[id])
      await saveAttendanceRequest({
        date: dateYmd,
        period,
        classStudentIds: ids,
        presentStudentIds: presentIds,
      })
      setSaveMsg('Attendance saved.')
      await refreshPresentRoster()
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
    <PageContainer variant="wide">
      <PageContentReveal>
      <RegisterStudentsModal
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSaved={handleRegisterSaved}
        existingClasses={allClasses}
      />

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
                <SkeletonStatus
                  label="Checking for saved attendance"
                  className="py-4 lg:text-left"
                >
                  <SkeletonBar className="mb-4 h-4 w-56" />
                  <ListRowsSkeleton rows={4} showAction={false} />
                </SkeletonStatus>
              ) : (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Students marked present
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Attendance for this date and period is already on file. You can
                    still change the class below to review or update the roster.
                  </p>
                  {savedPresentStudents.length === 0 ? (
                    <p className="mt-4 text-center text-slate-600">
                      No students were marked present for this session.
                    </p>
                  ) : (
                    <ul className="mt-4 divide-y divide-slate-100">
                      {savedPresentStudents.map((s) => {
                        const cls = allClasses.find((c) => c.id === s.classId)
                        return (
                          <li
                            key={s.id}
                            className="flex flex-wrap items-baseline justify-between gap-2 py-3"
                          >
                            <span className="text-slate-900">
                              {formatStudentName(s)}
                            </span>
                            {cls ? (
                              <span className="text-sm text-slate-500">
                                {cls.name} · {formatClassShiftLabel(cls.shift)}
                              </span>
                            ) : null}
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
                  onClick={toggleSelectAll}
                  disabled={students.length === 0 || loadingClass}
                  className="rounded-lg bg-secondary/15 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-secondary/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {allChecked ? 'Clear all' : 'Select all'}
                </button>
              </div>

              {loadingClass ? (
                <ScoreRosterSkeleton rows={6} className="py-4" />
              ) : students.length === 0 ? (
                <p className="py-8 text-center text-slate-600">
                  No students in this class yet. Use &quot;Register Students or
                  import from Excel&quot; above to add names.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-3">
                      <input
                        id={`stu-${s.id}`}
                        type="checkbox"
                        checked={Boolean(present[s.id])}
                        onChange={() => toggleOne(s.id)}
                        className="size-5 touch-manipulation rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <label
                        htmlFor={`stu-${s.id}`}
                        className="flex-1 cursor-pointer text-left text-slate-900"
                      >
                        {formatStudentName(s)}
                      </label>
                    </li>
                  ))}
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
      </PageContentReveal>
    </PageContainer>
  )
}
