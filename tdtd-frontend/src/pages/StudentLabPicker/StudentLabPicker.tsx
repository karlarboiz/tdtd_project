import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ContentReveal } from '@/components/ContentReveal/ContentReveal'
import { ListRowsSkeleton } from '@/components/LoadingSkeleton/ListRowsSkeleton'
import { SkeletonBlock } from '@/components/LoadingSkeleton/SkeletonBlock'
import { PageContainer } from '@/layouts/PageContainer'
import { PageContentReveal } from '@/layouts/PageContentReveal'
import { listClasses } from '../../api/classesApi'
import { listStudentsByClass, searchStudents } from '../../api/studentsApi'
import { studentLabPath } from '../../lib/studentLabRoute'
import { formatStudentName } from '../../lib/studentDisplay'
import { errorAlertClass, formInputClasses, formLabelClass } from '../../lib/uiClasses'
import type { ClassRow, StudentRow } from '@/types/schema'

function StudentRosterList({
  students,
  emptyMessage,
  detail,
}: {
  students: StudentRow[]
  emptyMessage: string
  detail: (student: StudentRow) => string
}) {
  return (
    <ul className="mt-3 max-h-[min(24rem,50svh)] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100">
      {students.map((s) => (
        <li key={s.id}>
          <Link
            to={studentLabPath(s.id)}
            className="flex min-h-11 items-center justify-between gap-2 px-3 py-3 text-slate-800 transition hover:bg-slate-50 active:bg-slate-100"
          >
            <span>
              <span className="font-medium">{formatStudentName(s)}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{detail(s)}</span>
            </span>
            <span className="shrink-0 text-slate-400" aria-hidden>
              ›
            </span>
          </Link>
        </li>
      ))}
      {students.length === 0 && (
        <li className="px-3 py-6 text-center text-sm text-slate-500">{emptyMessage}</li>
      )}
    </ul>
  )
}

export function StudentLabPicker() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [classId, setClassId] = useState('')
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [nameQuery, setNameQuery] = useState('')
  const [matches, setMatches] = useState<StudentRow[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const trimmedQuery = nameQuery.trim().replace(/\s+/g, ' ')

  const refreshClasses = useCallback(async () => {
    const list = await listClasses()
    setClasses(list)
    setClassId((prev) => {
      if (prev && list.some((c) => c.id === prev)) return prev
      return list[0]?.id ?? ''
    })
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        await refreshClasses()
      } finally {
        setLoading(false)
      }
    })()
  }, [refreshClasses])

  useEffect(() => {
    let cancelled = false
    if (!classId) {
      setStudents([])
      return
    }
    ;(async () => {
      try {
        const list = await listStudentsByClass(classId)
        if (!cancelled) setStudents(list)
      } catch {
        if (!cancelled) setStudents([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [classId])

  useEffect(() => {
    if (!trimmedQuery) {
      setMatches([])
      setSearchError(null)
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    setSearchError(null)
    ;(async () => {
      try {
        const list = await searchStudents(trimmedQuery)
        if (!cancelled) setMatches(list)
      } catch {
        if (!cancelled) {
          setMatches([])
          setSearchError('Could not search students.')
        }
      } finally {
        if (!cancelled) setSearching(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [trimmedQuery])

  const classNameById = (id: string) =>
    classes.find((c) => c.id === id)?.name ?? 'Unknown class'

  return (
    <PageContainer variant="wide" className="space-y-6">
      <PageContentReveal className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Lab</h1>
          <p className="mt-1 text-sm text-slate-600">
            Pick a class, or search by name across your classes, then open a student
            to view profile, attendance, and recent scores.
          </p>
        </div>

        {loading ? (
          <section
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-hidden
          >
            <SkeletonBlock className="mb-4 h-11 w-full rounded-xl" />
            <ListRowsSkeleton rows={5} />
          </section>
        ) : classes.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-slate-700">No classes yet.</p>
            <Link
              to="/classes"
              className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 font-semibold text-white"
            >
              Go to Classes
            </Link>
          </div>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className={formLabelClass} htmlFor="lab-class">
              Class
            </label>
            <select
              id="lab-class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className={`mt-1 py-3 ${formInputClasses()}`}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <label className={`mt-6 ${formLabelClass}`} htmlFor="lab-student-search">
              Search your classes
            </label>
            <input
              id="lab-student-search"
              type="search"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="First, middle, or last name"
              autoComplete="off"
              spellCheck={false}
              className={`mt-1 py-3 ${formInputClasses()}`}
            />
            <p className="mt-1 text-xs text-slate-500">
              Matches first, middle, and last name in your classes.
            </p>
            {searchError ? (
              <p className={`mt-2 ${errorAlertClass}`} role="alert">
                {searchError}
              </p>
            ) : null}

            {trimmedQuery ? (
              <>
                <h2 className="mt-6 font-semibold text-slate-900">
                  {searching ? 'Matches' : `Matches (${matches.length})`}
                </h2>
                {searching ? (
                  <p className="mt-3 text-sm text-slate-500">Searching…</p>
                ) : (
                  <StudentRosterList
                    students={matches}
                    emptyMessage="No students match that name."
                    detail={(s) =>
                      `${classNameById(s.classId)} · ${s.birthDate} · ${s.gender}`
                    }
                  />
                )}
              </>
            ) : null}

            <ContentReveal revealKey={classId}>
              <h2 className="mt-6 font-semibold text-slate-900">
                Students ({students.length})
              </h2>
              <StudentRosterList
                students={students}
                emptyMessage="No students in this class."
                detail={(s) => `${s.birthDate} · ${s.gender}`}
              />
            </ContentReveal>
          </section>
        )}
      </PageContentReveal>
    </PageContainer>
  )
}
