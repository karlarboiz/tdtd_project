import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { createClass, deleteClass, listClasses, updateClass } from '../../api/classesApi'
import {
  deleteStudent,
  listStudentsByClass,
  registerStudent,
  registerStudentsBulk,
  updateStudent,
} from '../../api/studentsApi'
import { ApiError } from '../../lib/http'
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

const rowActionClass =
  'min-h-10 self-center rounded-lg border border-secondary px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50'

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
  const [editClassName, setEditClassName] = useState('')
  const [editClassShift, setEditClassShift] = useState<ClassShift>('MRNG')
  const [classActionError, setClassActionError] = useState<string | null>(null)
  const [classBusy, setClassBusy] = useState(false)
  const [studentActionError, setStudentActionError] = useState<string | null>(null)
  const [studentBusy, setStudentBusy] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [editStu, setEditStu] = useState(emptyDraft)
  const [editStudentClassId, setEditStudentClassId] = useState('')
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

  useEffect(() => {
    const selected = classes.find((c) => c.id === selectedClassId)
    if (!selected) {
      setEditClassName('')
      setEditClassShift('MRNG')
      return
    }
    setEditClassName(selected.name)
    setEditClassShift(selected.shift)
  }, [classes, selectedClassId])

  useEffect(() => {
    setEditingStudentId(null)
    setStudentActionError(null)
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
      setStudentActionError(
        err instanceof ApiError ? err.message : 'Could not add student.',
      )
    }
  }

  async function saveClass(e: FormEvent) {
    e.preventDefault()
    if (!selectedClassId) return
    const name = editClassName.trim()
    if (!name) {
      setClassActionError('Name is required.')
      return
    }
    setClassBusy(true)
    setClassActionError(null)
    try {
      await updateClass(selectedClassId, { name, shift: editClassShift })
      await refreshClasses()
    } catch (err) {
      setClassActionError(
        err instanceof ApiError ? err.message : 'Could not update class.',
      )
    } finally {
      setClassBusy(false)
    }
  }

  async function removeSelectedClass() {
    const selected = classes.find((c) => c.id === selectedClassId)
    if (!selected) return
    const ok = window.confirm(
      `Delete class "${selected.name}"? This cannot be undone.`,
    )
    if (!ok) return
    setClassBusy(true)
    setClassActionError(null)
    try {
      await deleteClass(selected.id)
      await refreshClasses()
    } catch (err) {
      setClassActionError(
        err instanceof ApiError ? err.message : 'Could not delete class.',
      )
    } finally {
      setClassBusy(false)
    }
  }

  function beginEditStudent(student: StudentRow) {
    setEditingStudentId(student.id)
    setEditStu({
      firstName: student.firstName,
      middleName: student.middleName ?? '',
      lastName: student.lastName,
      birthDate: student.birthDate,
      gender: student.gender,
    })
    setEditStudentClassId(student.classId)
    setStudentActionError(null)
  }

  async function saveStudent(e: FormEvent) {
    e.preventDefault()
    if (!editingStudentId) return
    const payload = {
      firstName: editStu.firstName.trim(),
      middleName: editStu.middleName.trim() || undefined,
      lastName: editStu.lastName.trim(),
      birthDate: editStu.birthDate,
      gender: editStu.gender,
      classId: editStudentClassId,
    }
    if (!payload.firstName || !payload.lastName || !payload.birthDate || !payload.classId) {
      setStudentActionError('First name, last name, birth date, and class are required.')
      return
    }
    setStudentBusy(true)
    setStudentActionError(null)
    try {
      await updateStudent(editingStudentId, payload)
      setEditingStudentId(null)
      setEditStu(emptyDraft())
      if (selectedClassId) {
        setStudents(await listStudentsByClass(selectedClassId))
      }
    } catch (err) {
      setStudentActionError(
        err instanceof ApiError ? err.message : 'Could not update student.',
      )
    } finally {
      setStudentBusy(false)
    }
  }

  async function removeStudent(student: StudentRow) {
    const ok = window.confirm(
      `Delete ${formatStudentName(student)}? This cannot be undone.`,
    )
    if (!ok) return
    setStudentBusy(true)
    setStudentActionError(null)
    try {
      await deleteStudent(student.id)
      if (editingStudentId === student.id) {
        setEditingStudentId(null)
        setEditStu(emptyDraft())
      }
      if (selectedClassId) {
        setStudents(await listStudentsByClass(selectedClassId))
      }
    } catch (err) {
      setStudentActionError(
        err instanceof ApiError ? err.message : 'Could not delete student.',
      )
    } finally {
      setStudentBusy(false)
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
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between gap-3 lg:mb-8">
        <Link
          to="/"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Home
        </Link>
      </div>

      <h1 className="text-xl font-semibold text-slate-900">Classes &amp; students</h1>
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

            <form onSubmit={(e) => void saveClass(e)} className="mt-6 space-y-3">
              <h2 className="font-semibold text-slate-900">Edit class</h2>
              {classActionError ? (
                <p className={errorAlertClass} role="alert">
                  {classActionError}
                </p>
              ) : null}
              <label className={formLabelClass} htmlFor="edit-cname">
                Name
              </label>
              <input
                id="edit-cname"
                value={editClassName}
                onChange={(e) => setEditClassName(e.target.value)}
                disabled={!selectedClassId || classBusy}
                className={`py-2 ${formInputClasses({ error: Boolean(classActionError) })}`}
                aria-invalid={Boolean(classActionError)}
              />
              <label className={formLabelClass} htmlFor="edit-class-shift">
                Schedule
              </label>
              <select
                id="edit-class-shift"
                value={editClassShift}
                onChange={(e) => setEditClassShift(e.target.value as ClassShift)}
                disabled={!selectedClassId || classBusy}
                className={`py-3 ${formInputClasses({ error: Boolean(classActionError) })}`}
                aria-invalid={Boolean(classActionError)}
              >
                <option value="MRNG">Morning (MRNG)</option>
                <option value="AFTNN">Afternoon (AFTNN)</option>
              </select>
              <button
                type="submit"
                disabled={!selectedClassId || classBusy}
                className={`w-full py-3 ${primaryButtonClass}`}
              >
                {classBusy ? 'Saving…' : 'Save class'}
              </button>
              <button
                type="button"
                disabled={!selectedClassId || classBusy}
                onClick={() => void removeSelectedClass()}
                className={`w-full py-3 ${secondaryButtonClass}`}
              >
                Delete class
              </button>
            </form>

            <form onSubmit={addStudent} className="mt-6 space-y-3">
              <h2 className="font-semibold text-slate-900">Add student</h2>
              {studentActionError && !editingStudentId ? (
                <p className={errorAlertClass} role="alert">
                  {studentActionError}
                </p>
              ) : null}
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

            {editingStudentId ? (
              <form onSubmit={(e) => void saveStudent(e)} className="mt-6 space-y-3">
                <h2 className="font-semibold text-slate-900">Edit student</h2>
                {studentActionError ? (
                  <p className={errorAlertClass} role="alert">
                    {studentActionError}
                  </p>
                ) : null}
                <input
                  value={editStu.firstName}
                  onChange={(e) =>
                    setEditStu((s) => ({ ...s, firstName: e.target.value }))
                  }
                  disabled={studentBusy}
                  className={`py-2 ${formInputClasses({ error: Boolean(studentActionError) })}`}
                  placeholder="First name"
                  aria-invalid={Boolean(studentActionError)}
                />
                <input
                  value={editStu.middleName}
                  onChange={(e) =>
                    setEditStu((s) => ({ ...s, middleName: e.target.value }))
                  }
                  disabled={studentBusy}
                  className={`py-2 ${formInputClasses()}`}
                  placeholder="Middle name (optional)"
                />
                <input
                  value={editStu.lastName}
                  onChange={(e) =>
                    setEditStu((s) => ({ ...s, lastName: e.target.value }))
                  }
                  disabled={studentBusy}
                  className={`py-2 ${formInputClasses({ error: Boolean(studentActionError) })}`}
                  placeholder="Last name"
                  aria-invalid={Boolean(studentActionError)}
                />
                <input
                  type="date"
                  value={editStu.birthDate}
                  onChange={(e) =>
                    setEditStu((s) => ({ ...s, birthDate: e.target.value }))
                  }
                  disabled={studentBusy}
                  className={`py-2 ${formInputClasses({ error: Boolean(studentActionError) })}`}
                  aria-invalid={Boolean(studentActionError)}
                />
                <label className={formLabelClass} htmlFor="edit-stu-gender">
                  Gender
                </label>
                <select
                  id="edit-stu-gender"
                  value={editStu.gender}
                  onChange={(e) =>
                    setEditStu((s) => ({
                      ...s,
                      gender: e.target.value as StudentGenderCode,
                    }))
                  }
                  disabled={studentBusy}
                  className={`py-3 ${formInputClasses()}`}
                >
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                  <option value="O">Other (O)</option>
                </select>
                <label className={formLabelClass} htmlFor="edit-stu-class">
                  Class
                </label>
                <select
                  id="edit-stu-class"
                  value={editStudentClassId}
                  onChange={(e) => setEditStudentClassId(e.target.value)}
                  disabled={studentBusy}
                  className={`py-3 ${formInputClasses()}`}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {formatClassShiftLabel(c.shift)}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={studentBusy}
                  className={`w-full py-3 ${primaryButtonClass}`}
                >
                  {studentBusy ? 'Saving…' : 'Save student'}
                </button>
                <button
                  type="button"
                  disabled={studentBusy}
                  onClick={() => {
                    setEditingStudentId(null)
                    setEditStu(emptyDraft())
                    setStudentActionError(null)
                  }}
                  className={`w-full py-3 ${secondaryButtonClass}`}
                >
                  Cancel
                </button>
              </form>
            ) : null}
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
              {studentActionError ? (
                <p className={`mt-2 ${errorAlertClass}`} role="alert">
                  {studentActionError}
                </p>
              ) : null}
              <ul className="mt-3 min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100 lg:max-h-none">
                {students.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 px-2 py-1">
                    <Link
                      to={studentLabPath(s.id)}
                      className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 px-1 py-2 text-left text-slate-800 transition hover:bg-slate-50 active:bg-slate-100"
                    >
                      <span className="min-w-0">
                        <span className="font-medium">{formatStudentName(s)}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {s.birthDate} · {s.gender}
                        </span>
                      </span>
                      <span className="shrink-0 text-slate-400" aria-hidden>
                        ›
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => beginEditStudent(s)}
                      className={rowActionClass}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={studentBusy}
                      onClick={() => void removeStudent(s)}
                      className={rowActionClass}
                    >
                      Delete
                    </button>
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
    </div>
  )
}
