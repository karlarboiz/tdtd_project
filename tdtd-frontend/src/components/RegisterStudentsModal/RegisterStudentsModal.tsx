import {
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import * as XLSX from 'xlsx'
import { createClass } from '../../api/classesApi'
import { registerStudentsBulk } from '../../api/studentsApi'
import { ApiError } from '../../lib/http'
import { formatClassShiftLabel } from '../../lib/classShift'
import { formatStudentName } from '../../lib/studentDisplay'
import {
  parseStudentImportWorkbook,
  tryBuildStudentDraft,
} from '../../lib/studentImportParse'
import { downloadStudentImportSample } from '../../lib/studentImportSampleXlsx'
import { Button } from '@/components/Button/Button'
import {
  errorAlertClass,
  formInputClasses,
  formLabelClass,
  formLabelInlineClass,
} from '@/lib/uiClasses'
import type {
  ClassRow,
  ClassShift,
  StudentGenderCode,
  StudentUpsertPayload,
} from '@/types/schema'

type View = 'pick' | 'manual' | 'existing' | 'excel'

type RegisterStudentsModalProps = {
  open: boolean
  onClose: () => void
  /** Called after a class (and optional students) were saved; pass new class id to select it. */
  onSaved: (createdClassId?: string) => void
  existingClasses: ClassRow[]
}

const emptyStu = () => ({
  firstName: '',
  middleName: '',
  lastName: '',
  birthDate: '',
  gender: 'M' as StudentGenderCode,
})

export function RegisterStudentsModal({
  open,
  onClose,
  onSaved,
  existingClasses,
}: RegisterStudentsModalProps) {
  const titleId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<View>('pick')

  const [className, setClassName] = useState('')
  const [classShift, setClassShift] = useState<ClassShift>('MRNG')
  const [stu, setStu] = useState(emptyStu())
  const [pending, setPending] = useState<StudentUpsertPayload[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [excelTarget, setExcelTarget] = useState<'new' | string>('new')
  const [excelClassName, setExcelClassName] = useState('')
  const [excelShift, setExcelShift] = useState<ClassShift>('MRNG')
  const [existingTargetClassId, setExistingTargetClassId] = useState('')

  const resetFields = useCallback(() => {
    setClassName('')
    setClassShift('MRNG')
    setStu(emptyStu())
    setPending([])
    setError(null)
    setExcelTarget('new')
    setExcelClassName('')
    setExcelShift('MRNG')
    setExistingTargetClassId('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  useEffect(() => {
    if (open) {
      setView('pick')
      resetFields()
    }
  }, [open, resetFields])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function saveManual(e: FormEvent) {
    e.preventDefault()
    const cn = className.trim()
    if (!cn) {
      console.log('[tdtd register] manual save blocked: empty class name')
      setError('Enter a class name.')
      return
    }

    const batch = [...pending]
    const tail = tryBuildStudentDraft(stu)
    if ('ok' in tail) batch.push(tail.ok)

    if (batch.length === 0) {
      const hint =
        'error' in tail
          ? tail.error
          : 'Add at least one complete student (first & last name, birth date, gender), or tap Add to list.'
      console.log('[tdtd register] manual save blocked: no students', { hint })
      setError(hint)
      return
    }

    console.log('[tdtd register] manual flow start', {
      className: cn,
      shift: classShift,
      studentCount: batch.length,
    })
    setBusy(true)
    setError(null)
    try {
      const klass = await createClass({ name: cn, shift: classShift })
      console.log('[tdtd register] manual: class ready, bulk students…', klass.id)
      await registerStudentsBulk(klass.id, batch)
      console.log('[tdtd register] manual flow complete', klass.id)
      onSaved(klass.id)
      onClose()
    } catch (e) {
      console.warn('[tdtd register] manual flow error', e)
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not save. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function saveExisting(e: FormEvent) {
    e.preventDefault()
    const cid = existingTargetClassId.trim()
    if (!cid) {
      console.log('[tdtd register] existing save blocked: no class selected')
      setError('Select a class.')
      return
    }

    const batch = [...pending]
    const tail = tryBuildStudentDraft(stu)
    if ('ok' in tail) batch.push(tail.ok)

    if (batch.length === 0) {
      const hint =
        'error' in tail
          ? tail.error
          : 'Add at least one complete student (first & last name, birth date, gender), or tap Add to list.'
      console.log('[tdtd register] existing save blocked: no students', { hint })
      setError(hint)
      return
    }

    console.log('[tdtd register] existing class flow start', {
      classId: cid,
      studentCount: batch.length,
    })
    setBusy(true)
    setError(null)
    try {
      await registerStudentsBulk(cid, batch)
      console.log('[tdtd register] existing class flow complete', cid)
      onSaved(cid)
      onClose()
    } catch (e) {
      console.warn('[tdtd register] existing class flow error', e)
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not save. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  function addPendingStudent() {
    const r = tryBuildStudentDraft(stu)
    if ('error' in r) {
      console.log('[tdtd register] add to list rejected', r.error)
      setError(r.error)
      return
    }
    console.log('[tdtd register] student added to pending list', {
      name: `${r.ok.firstName} ${r.ok.lastName}`,
      birthDate: r.ok.birthDate,
    })
    setPending((p) => [...p, r.ok])
    setStu(emptyStu())
    setError(null)
  }

  async function saveExcel(files: FileList | null) {
    const file = files?.[0]
    if (!file) return

    console.log('[tdtd register] excel import start', {
      fileName: file.name,
      target: excelTarget,
    })
    setBusy(true)
    setError(null)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const { students: rows, errors } = parseStudentImportWorkbook(wb)
      if (errors.length > 0) {
        console.log('[tdtd register] excel parse errors', errors.slice(0, 5))
        setError(errors.slice(0, 5).join(' '))
        return
      }
      if (rows.length === 0) {
        console.log('[tdtd register] excel: zero student rows')
        setError('No valid student rows found.')
        return
      }

      let targetClassId: string
      let createdNewClass = false
      if (excelTarget === 'new') {
        const cn = excelClassName.trim()
        if (!cn) {
          console.log('[tdtd register] excel blocked: new class needs a name')
          setError('Enter a class name for this import.')
          return
        }
        const klass = await createClass({
          name: cn,
          shift: excelShift,
        })
        targetClassId = klass.id
        createdNewClass = true
      } else {
        targetClassId = excelTarget
      }

      console.log('[tdtd register] excel bulk registering', {
        targetClassId,
        createdNewClass,
        rowCount: rows.length,
      })
      await registerStudentsBulk(targetClassId, rows)
      console.log('[tdtd register] excel import complete', targetClassId)
      onSaved(createdNewClass ? targetClassId : undefined)
      onClose()
    } catch (e) {
      console.warn('[tdtd register] excel import error', e)
      setError(
        e instanceof ApiError
          ? e.message
          : 'Import failed. Check the file and try again.',
      )
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(90svh,640px)] w-full max-w-md flex-col rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-xl sm:rounded-3xl sm:pb-0"
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">
              {view === 'pick' && 'Register Students'}
              {view === 'manual' && 'Register Manually'}
              {view === 'existing' && 'Register Students (Existing Class)'}
              {view === 'excel' && 'Import from Excel'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              Close
            </button>
          </div>
          {view !== 'pick' && (
            <button
              type="button"
              onClick={() => {
                setView('pick')
                setError(null)
              }}
              className="mt-2 text-sm font-medium text-secondary hover:underline"
            >
              ← Back to options
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-4">
          {view === 'pick' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-600">
                Add a class roster by entering student details or importing Excel
                (see sample headers: firstName, middleName, lastName, birthDate,
                gender).
              </p>
              <button
                type="button"
                onClick={() => setView('manual')}
                className="rounded-2xl bg-primary px-4 py-4 text-left font-semibold text-white shadow-md transition hover:bg-indigo-600"
              >
                Register Manually
                <span className="mt-1 block text-sm font-normal text-indigo-100">
                  Create a class and add students with names, birth date, gender
                </span>
              </button>
              {existingClasses.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setExistingTargetClassId(existingClasses[0]?.id ?? '')
                    setView('existing')
                  }}
                  className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/90 px-4 py-4 text-left font-semibold text-indigo-900 transition hover:bg-indigo-100"
                >
                  Register Students (Existing Class)
                  <span className="mt-1 block text-sm font-normal text-indigo-800/90">
                    Add students to a class you already created
                  </span>
                </button>
              ) : (
                <div
                  className="cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-4 text-left opacity-80"
                  aria-disabled="true"
                >
                  <p className="font-semibold text-slate-500">
                    Register Students (Existing Class)
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Register a class first — use Register Manually or Import from
                    Excel to create a class, then you can add more students here.
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setView('excel')}
                className="rounded-2xl border-2 border-secondary bg-teal-50/80 px-4 py-4 text-left font-semibold text-teal-900 transition hover:bg-teal-100"
              >
                Import from Excel
                <span className="mt-1 block text-sm font-normal text-teal-800/90">
                  Row 1 = column headers; following rows = students
                </span>
              </button>
            </div>
          )}

          {(view === 'manual' || view === 'existing') && (
            <form
              onSubmit={view === 'manual' ? saveManual : saveExisting}
              className="space-y-4"
            >
              {view === 'manual' && (
                <>
                  <div>
                    <label
                      className={formLabelClass}
                      htmlFor="modal-class-name"
                    >
                      Class Name
                    </label>
                    <input
                      id="modal-class-name"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-2 outline-none ring-secondary focus:ring-2"
                      placeholder="e.g. Grade 5"
                      autoComplete="off"
                    />
                  </div>
                  <div>
                    <label
                      className={formLabelClass}
                      htmlFor="modal-class-shift"
                    >
                      Schedule
                    </label>
                    <select
                      id="modal-class-shift"
                      value={classShift}
                      onChange={(e) =>
                        setClassShift(e.target.value as ClassShift)
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-3 outline-none ring-secondary focus:ring-2"
                    >
                      <option value="MRNG">Morning (MRNG)</option>
                      <option value="AFTNN">Afternoon (AFTNN)</option>
                    </select>
                  </div>
                </>
              )}
              {view === 'existing' && (
                <div>
                  <label
                    className={formLabelClass}
                    htmlFor="modal-existing-class"
                  >
                    Class
                  </label>
                  <select
                    id="modal-existing-class"
                    value={existingTargetClassId}
                    onChange={(e) => setExistingTargetClassId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-3 outline-none ring-secondary focus:ring-2"
                  >
                    <option value="">Select a class…</option>
                    {existingClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {formatClassShiftLabel(c.shift)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <p className={`text-xs font-medium ${formLabelInlineClass}`}>
                  Student (then Add to list)
                </p>
                <input
                  value={stu.firstName}
                  onChange={(e) =>
                    setStu((s) => ({ ...s, firstName: e.target.value }))
                  }
                  className={`mt-2 py-2 text-sm ${formInputClasses({ error: Boolean(error) })}`}
                  placeholder="First name"
                  autoComplete="off"
                />
                <input
                  value={stu.middleName}
                  onChange={(e) =>
                    setStu((s) => ({ ...s, middleName: e.target.value }))
                  }
                  className={`mt-2 py-2 text-sm ${formInputClasses({ error: Boolean(error) })}`}
                  placeholder="Middle name (optional)"
                  autoComplete="off"
                />
                <input
                  value={stu.lastName}
                  onChange={(e) =>
                    setStu((s) => ({ ...s, lastName: e.target.value }))
                  }
                  className={`mt-2 py-2 text-sm ${formInputClasses({ error: Boolean(error) })}`}
                  placeholder="Last name"
                  autoComplete="off"
                />
                <input
                  type="date"
                  value={stu.birthDate}
                  onChange={(e) =>
                    setStu((s) => ({ ...s, birthDate: e.target.value }))
                  }
                  className={`mt-2 py-2 text-sm ${formInputClasses({ error: Boolean(error) })}`}
                />
                <select
                  value={stu.gender}
                  onChange={(e) =>
                    setStu((s) => ({
                      ...s,
                      gender: e.target.value as StudentGenderCode,
                    }))
                  }
                  className={`mt-2 py-2 text-sm ${formInputClasses({ error: Boolean(error) })}`}
                >
                  <option value="M">Male (M)</option>
                  <option value="F">Female (F)</option>
                  <option value="O">Other (O)</option>
                </select>
                <button
                  type="button"
                  onClick={addPendingStudent}
                  className="mt-3 w-full rounded-lg border-2 border-secondary bg-white py-2 text-sm font-semibold text-secondary hover:bg-teal-50"
                >
                  Add to list
                </button>
              </div>

              {pending.length > 0 && (
                <ul className="max-h-32 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm text-slate-800">
                  {pending.map((r, i) => (
                    <li key={`${r.firstName}-${r.lastName}-${i}`}>
                      {formatStudentName(r)} · {r.birthDate} · {r.gender}
                    </li>
                  ))}
                </ul>
              )}

              {error && (
                <p className={errorAlertClass} role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" fullWidth disabled={busy}>
                {busy
                  ? 'Saving…'
                  : view === 'existing'
                    ? 'Add students to class'
                    : 'Save class and students'}
              </Button>
            </form>
          )}

          {view === 'excel' && (
            <div className="space-y-4">
              {existingClasses.length > 0 && (
                <div>
                  <label
                    className={formLabelClass}
                    htmlFor="excel-target"
                  >
                    Import into
                  </label>
                  <select
                    id="excel-target"
                    value={excelTarget}
                    onChange={(e) =>
                      setExcelTarget(
                        e.target.value === 'new' ? 'new' : e.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-3 outline-none ring-secondary focus:ring-2"
                  >
                    <option value="new">New class…</option>
                    {existingClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {formatClassShiftLabel(c.shift)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {excelTarget === 'new' && (
                <div className="space-y-4">
                  <div>
                    <label
                      className={formLabelClass}
                      htmlFor="excel-class-name"
                    >
                      Class Name
                    </label>
                    <input
                      id="excel-class-name"
                      value={excelClassName}
                      onChange={(e) => setExcelClassName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-2 outline-none ring-secondary focus:ring-2"
                      placeholder="e.g. Grade 5"
                    />
                  </div>
                  <div>
                    <label
                      className={formLabelClass}
                      htmlFor="excel-class-shift"
                    >
                      Schedule
                    </label>
                    <select
                      id="excel-class-shift"
                      value={excelShift}
                      onChange={(e) =>
                        setExcelShift(e.target.value as ClassShift)
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-neutral-bg px-3 py-3 outline-none ring-secondary focus:ring-2"
                    >
                      <option value="MRNG">Morning (MRNG)</option>
                      <option value="AFTNN">Afternoon (AFTNN)</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className={formLabelClass}>
                  Excel file
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  <strong>Row 1:</strong> headers{' '}
                  <strong>firstName</strong>, <strong>middleName</strong>,{' '}
                  <strong>lastName</strong>, <strong>birthDate</strong>,{' '}
                  <strong>gender</strong>. Use <strong>YYYY-MM-DD</strong> dates;
                  gender <strong>M</strong> / <strong>F</strong> / <strong>O</strong>
                  . Middle name can be blank.
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    disabled={busy}
                    onChange={(e) => void saveExcel(e.target.files)}
                    className={`block w-full min-w-0 flex-1 text-sm text-neutral-label file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white ${error ? 'rounded-xl border-2 border-primary' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={busy}
                    onClick={() => downloadStudentImportSample()}
                  >
                    Download sample (.xlsx)
                  </Button>
                </div>
              </div>

              {error && (
                <p className={errorAlertClass} role="alert">
                  {error}
                </p>
              )}
              {busy && (
                <p className="text-center text-sm text-slate-500">Working…</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
