import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ContentReveal } from '@/components/ContentReveal/ContentReveal'
import { SubjectsPageSkeleton } from '@/components/LoadingSkeleton/SubjectsPageSkeleton'
import { PageContainer } from '@/layouts/PageContainer'
import { PageContentReveal } from '@/layouts/PageContentReveal'
import * as XLSX from 'xlsx'
import { AddSubjectModal } from '../../components/AddSubjectModal/AddSubjectModal'
import {
  createSchoolYear,
  getActiveSchoolYear,
  listSchoolYearSubjects,
  registerSchoolYearSubject,
  unregisterSchoolYearSubject,
} from '../../api/schoolYearApi'
import { ApiError } from '../../lib/http'
import { defaultSchoolYearLabel } from '../../lib/schoolYearLabel'
import { parseSubjectImportWorkbook } from '../../lib/subjectImportParse'
import { downloadSubjectImportSample } from '../../lib/subjectImportSampleXlsx'
import {
  errorAlertClass,
  formInputClasses,
  formLabelInlineClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/lib/uiClasses'
import type { SchoolYearRow, SchoolYearSubjectRow } from '@/types/schema'

export function Subjects() {
  const [schoolYear, setSchoolYear] = useState<SchoolYearRow | null>(null)
  const [subjects, setSubjects] = useState<SchoolYearSubjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [setupBusy, setSetupBusy] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [gradeFilter, setGradeFilter] = useState<'all' | string>('all')
  const fileRef = useRef<HTMLInputElement>(null)

  const gradeLevels = useMemo(() => {
    const levels = [...new Set(subjects.map((s) => s.gradeLevel))]
    return levels.sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    )
  }, [subjects])

  const filteredSubjects = useMemo(() => {
    if (gradeFilter === 'all') return subjects
    return subjects.filter((s) => s.gradeLevel === gradeFilter)
  }, [subjects, gradeFilter])

  useEffect(() => {
    if (gradeFilter !== 'all' && !gradeLevels.includes(gradeFilter)) {
      setGradeFilter('all')
    }
  }, [gradeFilter, gradeLevels])

  const refreshSubjects = useCallback(async (yearId: string) => {
    const list = await listSchoolYearSubjects(yearId)
    setSubjects(list)
  }, [])

  const loadPage = useCallback(async () => {
    setLoading(true)
    setPageError(null)
    try {
      const year = await getActiveSchoolYear()
      setSchoolYear(year)
      await refreshSubjects(year.id)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSchoolYear(null)
        setSubjects([])
      } else {
        setPageError(
          err instanceof ApiError ? err.message : 'Could not load subjects.',
        )
      }
    } finally {
      setLoading(false)
    }
  }, [refreshSubjects])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  async function setupSchoolYear() {
    setSetupBusy(true)
    setPageError(null)
    try {
      const year = await createSchoolYear({
        label: defaultSchoolYearLabel(),
        setActive: true,
      })
      setSchoolYear(year)
      setSubjects([])
    } catch (err) {
      setPageError(
        err instanceof ApiError
          ? err.message
          : 'Could not create school year. Try again.',
      )
    } finally {
      setSetupBusy(false)
    }
  }

  async function onExcel(files: FileList | null) {
    const file = files?.[0]
    setImportError(null)
    if (!file || !schoolYear) return

    setImportBusy(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const { subjects: rows, errors } = parseSubjectImportWorkbook(wb)
      if (errors.length > 0) {
        setImportError(errors.slice(0, 5).join(' '))
        return
      }
      if (rows.length === 0) {
        setImportError('No valid subject rows found.')
        return
      }

      const importErrors: string[] = []
      let imported = 0
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!
        try {
          await registerSchoolYearSubject(schoolYear.id, {
            name: row.name,
            shortCode: row.shortCode,
            gradeLevel: row.gradeLevel,
          })
          imported++
        } catch (err) {
          const msg =
            err instanceof ApiError ? err.message : 'Registration failed'
          importErrors.push(`Row ${i + 2}: ${msg}`)
        }
      }

      await refreshSubjects(schoolYear.id)
      if (importErrors.length > 0) {
        setImportError(
          `${imported} added. ${importErrors.slice(0, 3).join(' ')}${
            importErrors.length > 3 ? ' …' : ''
          }`,
        )
      }
    } catch {
      setImportError('Import failed. Check the file format.')
    } finally {
      setImportBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function removeSubject(
    registrationId: string,
    subjectName: string,
    gradeLevel: string,
  ) {
    if (!schoolYear) return
    const ok = window.confirm(
      `Remove "${subjectName}" (${gradeLevel}) from this school year? This is only allowed if the subject is not assigned to a class or used in scores.`,
    )
    if (!ok) return

    setRemovingId(registrationId)
    setPageError(null)
    try {
      await unregisterSchoolYearSubject(schoolYear.id, registrationId)
      await refreshSubjects(schoolYear.id)
    } catch (err) {
      setPageError(
        err instanceof ApiError ? err.message : 'Could not remove subject.',
      )
    } finally {
      setRemovingId(null)
    }
  }

  const hasSubjects = subjects.length > 0
  const hasGradeFilter = gradeFilter !== 'all'
  const showGradeFilter = hasSubjects && gradeLevels.length > 0

  return (
    <PageContainer variant="wide">
      <PageContentReveal>
      <div className="mb-6 flex items-center justify-between gap-3 lg:mb-8">
        <Link
          to="/"
          className={`rounded-lg border border-secondary bg-white px-3 py-2 text-sm font-medium text-secondary shadow-sm transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary`}
        >
          ← Home
        </Link>
      </div>

      <h1 className="text-xl font-semibold text-slate-900">Subjects</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        Register the subjects you teach this school year, then assign them to classes
        when recording scores.
      </p>

      {schoolYear ? (
        <p className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          School year: {schoolYear.label}
        </p>
      ) : null}

      {pageError ? (
        <p className={`mt-4 ${errorAlertClass}`} role="alert">
          {pageError}
        </p>
      ) : null}

      {loading ? (
        <SubjectsPageSkeleton className="mt-8" />
      ) : !schoolYear ? (
        <section className="mt-8 max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Set up school year</h2>
          <p className="mt-2 text-sm text-slate-600">
            Create an active school year before registering subjects (suggested:{' '}
            <strong>{defaultSchoolYearLabel()}</strong>).
          </p>
          <button
            type="button"
            disabled={setupBusy}
            onClick={() => void setupSchoolYear()}
            className={`mt-4 w-full py-3 sm:w-auto sm:px-6 ${primaryButtonClass}`}
          >
            {setupBusy ? 'Creating…' : 'Create active school year'}
          </button>
        </section>
      ) : (
        <>
          <div className="mt-8 flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
              <h2 className="font-semibold text-slate-900">Add subjects</h2>
              <p className="mt-1 text-sm text-slate-600">
                Add one subject at a time or import many from Excel.
              </p>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className={`mt-4 w-full py-3 ${primaryButtonClass}`}
              >
                Add subject manually
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-8">
              <h2 className="font-semibold text-slate-900">Import from Excel</h2>
              <p className="mt-1 text-xs text-slate-500">
                Row 1 = headers: <strong>Name</strong>, <strong>Grade Level</strong>{' '}
                (required), <strong>Short Code</strong> (optional). Empty rows are
                skipped.
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
                  disabled={importBusy}
                  onChange={(e) => void onExcel(e.target.files)}
                  className={`block w-full min-w-0 flex-1 text-sm text-neutral-label file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-50 ${importError ? 'rounded-xl border-2 border-primary' : ''}`}
                  aria-invalid={Boolean(importError)}
                />
                <button
                  type="button"
                  disabled={importBusy}
                  onClick={() => downloadSubjectImportSample()}
                  className={`shrink-0 px-4 py-2.5 text-sm ${secondaryButtonClass}`}
                >
                  Download sample (.xlsx)
                </button>
              </div>
              {importBusy ? (
                <p className="mt-2 text-sm text-slate-500">Importing…</p>
              ) : null}
            </section>
          </div>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-semibold text-slate-900">
                Registered Subjects (
                {hasGradeFilter
                  ? `${filteredSubjects.length} of ${subjects.length}`
                  : subjects.length}
                )
              </h2>
              {showGradeFilter ? (
                <label className="flex min-w-0 flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
                  <span className={`shrink-0 ${formLabelInlineClass}`}>
                    Grade level
                  </span>
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className={`min-h-10 w-full min-w-0 py-2 sm:w-auto sm:min-w-[12rem] ${formInputClasses()}`}
                    aria-label="Filter registered subjects by grade level"
                  >
                    <option value="all">All grade levels</option>
                    {gradeLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            {hasSubjects ? (
              filteredSubjects.length > 0 ? (
              <ContentReveal revealKey={`${gradeFilter}-${filteredSubjects.length}`}>
              <>
              <ul className="divide-y divide-slate-100 sm:hidden" role="list">
                {filteredSubjects.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-col gap-3 px-4 py-4"
                    role="listitem"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{s.subjectName}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {s.gradeLevel}
                        {s.subjectShortCode ? ` · ${s.subjectShortCode}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={removingId === s.id}
                      onClick={() =>
                        void removeSubject(s.id, s.subjectName, s.gradeLevel)
                      }
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-secondary px-3 py-2 text-sm font-semibold text-secondary transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50 sm:w-auto"
                    >
                      {removingId === s.id ? 'Removing…' : 'Remove'}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-neutral-bg/80 text-slate-600">
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Subject
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Grade level
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Short code
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubjects.map((s) => (
                      <tr key={s.id} className="text-slate-800">
                        <td className="px-5 py-3 font-medium">{s.subjectName}</td>
                        <td className="px-5 py-3 text-slate-700">{s.gradeLevel}</td>
                        <td className="px-5 py-3 text-slate-600">
                          {s.subjectShortCode ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            disabled={removingId === s.id}
                            onClick={() =>
                              void removeSubject(s.id, s.subjectName, s.gradeLevel)
                            }
                            className="rounded-lg border border-secondary px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50"
                          >
                            {removingId === s.id ? 'Removing…' : 'Remove'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
              </ContentReveal>
              ) : (
                <p className="px-5 py-10 text-center text-sm text-slate-500">
                  No subjects for <strong>{gradeFilter}</strong>. Choose{' '}
                  <strong>All grade levels</strong> to see every registration.
                </p>
              )
            ) : (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                No subjects registered yet. Add one manually or import from Excel.
              </p>
            )}
          </section>

          <AddSubjectModal
            open={addOpen}
            schoolYearId={schoolYear.id}
            onClose={() => setAddOpen(false)}
            onSaved={() => void refreshSubjects(schoolYear.id)}
          />
        </>
      )}
      </PageContentReveal>
    </PageContainer>
  )
}
