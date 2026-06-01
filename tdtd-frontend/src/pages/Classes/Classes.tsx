import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '@/layouts/PageContainer'
import * as XLSX from 'xlsx'
import { createClass, listClasses } from '../../api/classesApi'
import {
  listStudentsByClass,
  registerStudent,
  registerStudentsBulk,
} from '../../api/studentsApi'
import { formatClassShiftLabel } from '../../lib/classShift'
import { formatStudentName } from '../../lib/studentDisplay'
import { studentLabPath } from '../../lib/studentLabRoute'
import { parseStudentImportWorkbook } from '../../lib/studentImportParse'
import { downloadStudentImportSample } from '../../lib/studentImportSampleXlsx'
import {
  errorAlertClass,
  formInputClasses,
  formLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/lib/uiClasses'
import type {
  ClassRow,
  ClassShift,
  StudentGenderCode,
  StudentRow,
} from '@/types/schema'

const emptyDraft = (): {
  firstName: string
  middleName: string
  lastName: string
  birthDate: string
  gender: StudentGenderCode
} => ({
  firstName: '',
  middleName: '',
  lastName: '',
  birthDate: '',
  gender: 'M',
})

export function Classes() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [students, setStudents] = useState<StudentRow[]>([])
  const [className, setClassName] = useState('')
  const [classShift, setClassShift] = useState<ClassShift>('MRNG')
  const [stu, setStu] = useState(emptyDraft)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const refreshClasses = useCallback(async () => {
    const list = await listClasses()
    setClasses(list)
    setSelectedClassId((prev) => {
      if (prev && list.some((c) => c.id === prev)) return prev
      return list[0]?.id ?? ''
    })
  }, [])

  useEffect(() => {
    void refreshClasses()
  }, [refreshClasses])

  useEffect(() => {
    let cancelled = false
    if (!selectedClassId) {
      setStudents([])
      return
    }
    ;(async () => {
      try {
        const list = await listStudentsByClass(selectedClassId)
        if (!cancelled) setStudents(list)
      } catch {
        if (!cancelled) setStudents([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedClassId])

  async function addClass(e: FormEvent) {
    e.preventDefault()
    const name = className.trim()
    if (!name) {
      console.log('[tdtd register] Classes page: add class skipped (empty name)')
      return
    }
    console.log('[tdtd register] Classes page: new class', {
      name,
      shift: classShift,
    })
    try {
      await createClass({ name, shift: classShift })
      await refreshClasses()
      console.log('[tdtd register] Classes page: class list refreshed')
    } catch (err) {
      console.warn('[tdtd register] Classes page: add class failed', err)
      throw err
    }
    setClassName('')
    setClassShift('MRNG')
  }

  async function addStudent(e: FormEvent) {
    e.preventDefault()
    if (!selectedClassId) {
      console.log('[tdtd register] Classes page: add student skipped (no class)')
      return
    }
    const payload = {
      firstName: stu.firstName.trim(),
      middleName: stu.middleName.trim() || undefined,
      lastName: stu.lastName.trim(),
      birthDate: stu.birthDate,
      gender: stu.gender,
      classId: selectedClassId,
    }
    if (!payload.firstName || !payload.lastName || !payload.birthDate) {
      console.log('[tdtd register] Classes page: add student skipped (incomplete form)')
      return
    }
    console.log('[tdtd register] Classes page: register one student', payload.classId)
    try {
      await registerStudent(payload)
      setStu(emptyDraft())
      const list = await listStudentsByClass(selectedClassId)
      setStudents(list)
      console.log('[tdtd register] Classes page: roster refreshed', list.length)
    } catch (err) {
      console.warn('[tdtd register] Classes page: add student failed', err)
      throw err
    }
  }

  async function onExcel(files: FileList | null) {
    const file = files?.[0]
    setImportError(null)
    if (!file || !selectedClassId) {
      console.log('[tdtd register] Classes page: excel skipped', {
        hasFile: Boolean(file),
        selectedClassId,
      })
      return
    }
    console.log('[tdtd register] Classes page: excel import', {
      fileName: file.name,
      classId: selectedClassId,
    })
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const { students: rows, errors } = parseStudentImportWorkbook(wb)
      if (errors.length > 0) {
        console.log('[tdtd register] Classes page: excel parse errors', errors)
        setImportError(errors.slice(0, 5).join(' '))
        if (fileRef.current) fileRef.current.value = ''
        return
      }
      if (rows.length === 0) {
        console.log('[tdtd register] Classes page: excel no rows')
        setImportError('No valid student rows found.')
        if (fileRef.current) fileRef.current.value = ''
        return
      }
      await registerStudentsBulk(selectedClassId, rows)
      const list = await listStudentsByClass(selectedClassId)
      setStudents(list)
      console.log('[tdtd register] Classes page: excel done', {
        imported: rows.length,
        rosterSize: list.length,
      })
    } catch (err) {
      console.warn('[tdtd register] Classes page: excel failed', err)
      setImportError('Import failed. Check the file format.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <PageContainer variant="wide">
      <div className="mb-6 flex items-center justify-between gap-3 lg:mb-8">
        <Link
          to="/"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Home
        </Link>
      </div>

      <h1 className="text-xl font-semibold text-slate-900">Classes &amp; Students</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Create a section, then add students with full details or import from Excel (see sample).
      </p>

      <div className="mt-8 flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-8 lg:col-span-5">
          <form
            onSubmit={addClass}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
          <h2 className="font-semibold text-slate-900">New class</h2>
          <label className={`mt-4 ${formLabelClass}`} htmlFor="cname">
            Name
          </label>
          <input
            id="cname"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className={`mt-1 py-2 ${formInputClasses()}`}
            placeholder="e.g. Grade 5"
          />
          <label className={`mt-3 ${formLabelClass}`} htmlFor="class-shift">
            Schedule
          </label>
          <select
            id="class-shift"
            value={classShift}
            onChange={(e) => setClassShift(e.target.value as ClassShift)}
            className={`mt-1 py-3 ${formInputClasses()}`}
          >
            <option value="MRNG">Morning (MRNG)</option>
            <option value="AFTNN">Afternoon (AFTNN)</option>
          </select>
          <button
            type="submit"
            className={`mt-4 w-full py-3 ${primaryButtonClass}`}
          >
            Add class
          </button>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className={formLabelClass} htmlFor="pick-class">
              Active class
            </label>
            <select
              id="pick-class"
              className={`mt-2 py-3 ${formInputClasses()}`}
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              {classes.length === 0 ? (
                <option value="">No classes yet</option>
              ) : (
                classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {formatClassShiftLabel(c.shift)}
                  </option>
                ))
              )}
            </select>

            <form onSubmit={addStudent} className="mt-6 space-y-3">
              <h2 className="font-semibold text-slate-900">Add student</h2>
              <input
                value={stu.firstName}
                onChange={(e) => setStu((s) => ({ ...s, firstName: e.target.value }))}
                disabled={!selectedClassId}
                className={`mt-1 py-2 ${formInputClasses()}`}
                placeholder="First name"
              />
              <input
                value={stu.middleName}
                onChange={(e) => setStu((s) => ({ ...s, middleName: e.target.value }))}
                disabled={!selectedClassId}
                className={`py-2 ${formInputClasses()}`}
                placeholder="Middle name (optional)"
              />
              <input
                value={stu.lastName}
                onChange={(e) => setStu((s) => ({ ...s, lastName: e.target.value }))}
                disabled={!selectedClassId}
                className={`py-2 ${formInputClasses()}`}
                placeholder="Last name"
              />
              <input
                type="date"
                value={stu.birthDate}
                onChange={(e) => setStu((s) => ({ ...s, birthDate: e.target.value }))}
                disabled={!selectedClassId}
                className={`py-2 ${formInputClasses()}`}
              />
              <label className={formLabelClass} htmlFor="stu-gender">
                Gender
              </label>
              <select
                id="stu-gender"
                value={stu.gender}
                onChange={(e) =>
                  setStu((s) => ({
                    ...s,
                    gender: e.target.value as StudentGenderCode,
                  }))
                }
                disabled={!selectedClassId}
                className={`py-3 ${formInputClasses()}`}
              >
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
                <option value="O">Other (O)</option>
              </select>
              <button
                type="submit"
                disabled={!selectedClassId}
                className="w-full rounded-xl border-2 border-secondary bg-teal-50 py-3 font-semibold text-secondary hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add student
              </button>
            </form>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7 lg:flex lg:min-h-0 lg:max-h-[calc(100svh-10rem)] lg:flex-col lg:self-start">
          <div className="min-h-0 lg:flex lg:flex-1 lg:flex-col">
            <h2 className="font-semibold text-slate-900">Import from Excel</h2>
            <p className="mt-1 text-xs text-slate-500">
              Row 1 = headers: <strong>First Name</strong>, <strong>Middle Name</strong>,{' '}
              <strong>Last Name</strong>, <strong>Birth Date</strong>, <strong>Gender</strong>.
              Use <strong>YYYY-MM-DD</strong> for dates; gender <strong>M</strong>, <strong>F</strong>, or{' '}
              <strong>O</strong> (or Male/Female/Other). Empty middle names are OK. Empty rows are skipped.
            </p>
            {importError ? (
              <p className={`mt-2 ${errorAlertClass}`} role="alert">
                {importError}
              </p>
            ) : null}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                disabled={!selectedClassId}
                onChange={(e) => void onExcel(e.target.files)}
                className={`block w-full min-w-0 flex-1 text-sm text-neutral-label file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white ${importError ? 'rounded-xl border-2 border-primary' : ''}`}
                aria-invalid={Boolean(importError)}
              />
              <button
                type="button"
                disabled={!selectedClassId}
                onClick={() => downloadStudentImportSample()}
                className={`shrink-0 px-4 py-2.5 text-sm ${secondaryButtonClass}`}
              >
                Download sample (.xlsx)
              </button>
            </div>

            <div className="mt-8 flex min-h-0 flex-1 flex-col border-t border-slate-100 pt-4 lg:min-h-[12rem]">
              <h2 className="shrink-0 font-semibold text-slate-900">
                Students ({students.length})
              </h2>
              <ul className="mt-3 min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100 lg:max-h-none">
                {students.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={studentLabPath(s.id)}
                      className="flex min-h-11 items-center justify-between gap-2 px-3 py-2 text-left text-slate-800 transition hover:bg-slate-50 active:bg-slate-100"
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
                    No students yet.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  )
}
