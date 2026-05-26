import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listClasses } from '../../api/classesApi'
import { listStudentsByClass } from '../../api/studentsApi'
import { formatClassShiftLabel } from '../../lib/classShift'
import { studentLabPath } from '../../lib/studentLabRoute'
import { formatStudentName } from '../../lib/studentDisplay'
import type { ClassRow, StudentRow } from '@/types/schema'

export function StudentLabPicker() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [classId, setClassId] = useState('')
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)

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

  const selectedClass = classes.find((c) => c.id === classId)

  if (loading) {
    return <p className="text-sm text-slate-500">Loading classes…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Lab</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pick a class, then a student to view profile, attendance, and recent scores.
        </p>
      </div>

      {classes.length === 0 ? (
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
          <label
            className="block text-sm font-medium text-slate-700"
            htmlFor="lab-class"
          >
            Class
          </label>
          <select
            id="lab-class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-3 outline-none ring-secondary focus:ring-2"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({formatClassShiftLabel(c.shift)})
              </option>
            ))}
          </select>

          {selectedClass ? (
            <p className="mt-2 text-xs text-slate-500">
              {formatClassShiftLabel(selectedClass.shift)}
            </p>
          ) : null}

          <h2 className="mt-6 font-semibold text-slate-900">
            Students ({students.length})
          </h2>
          <ul className="mt-3 max-h-[min(24rem,50svh)] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  to={studentLabPath(s.id)}
                  className="flex min-h-11 items-center justify-between gap-2 px-3 py-3 text-slate-800 transition hover:bg-slate-50 active:bg-slate-100"
                >
                  <span>
                    <span className="font-medium">{formatStudentName(s)}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {s.birthDate} · {s.gender}
                    </span>
                  </span>
                  <span className="shrink-0 text-slate-400" aria-hidden>
                    ›
                  </span>
                </Link>
              </li>
            ))}
            {students.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                No students in this class.
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  )
}
