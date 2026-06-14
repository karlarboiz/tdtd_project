import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listClasses } from '@/api/classesApi'
import {
  autofillReportCards,
  computeGrades,
  downloadReport,
  getSchoolSettings,
  saveSchoolSettings,
  type ReportForm,
  type SchoolSettings,
} from '@/api/depedApi'
import { FormPanelSkeleton } from '@/components/LoadingSkeleton/FormPanelSkeleton'
import { PageContainer } from '@/layouts/PageContainer'
import { PageContentReveal } from '@/layouts/PageContentReveal'
import { formatClassShiftLabel } from '@/lib/classShift'
import { ApiError } from '@/lib/http'
import {
  bodyMutedClass,
  errorAlertClass,
  formInputClasses,
  formLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/lib/uiClasses'
import type { ClassRow } from '@/types/schema'

type FormOption = {
  id: ReportForm
  code: string
  title: string
  description: string
  needsMonth?: boolean
}

const FORM_OPTIONS: FormOption[] = [
  {
    id: 'sf1',
    code: 'SF1',
    title: 'School Register',
    description: 'Enrollment master list — LRN, biodata, address, parents.',
  },
  {
    id: 'sf2',
    code: 'SF2',
    title: 'Daily Attendance',
    description: 'Learner attendance by day for one month.',
    needsMonth: true,
  },
  {
    id: 'sf4',
    code: 'SF4',
    title: 'Monthly Attendance',
    description: 'Class matrix with daily present counts.',
    needsMonth: true,
  },
  {
    id: 'sf5',
    code: 'SF5',
    title: 'Promotion Report',
    description: 'Final grades and promoted / retained status.',
  },
  {
    id: 'sf9',
    code: 'SF9',
    title: 'Report Card',
    description: 'Quarterly grades and descriptors per subject.',
  },
  {
    id: 'sf10',
    code: 'SF10',
    title: 'Permanent Record',
    description: 'Cumulative academic record across school years.',
  },
]

const EMPTY_SETTINGS: SchoolSettings = {
  schoolName: '',
  schoolId: '',
  district: '',
  division: '',
  region: '',
  schoolAddress: '',
  schoolHeadName: '',
}

function currentMonthValue(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function Reports() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [classId, setClassId] = useState('')
  const [form, setForm] = useState<ReportForm>('sf1')
  const [month, setMonth] = useState(currentMonthValue)
  const [settings, setSettings] = useState<SchoolSettings>(EMPTY_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportBusy, setExportBusy] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [computeBusy, setComputeBusy] = useState<number | null>(null)
  const [gradesOk, setGradesOk] = useState<number | null>(null)

  const selectedForm = useMemo(
    () => FORM_OPTIONS.find((f) => f.id === form),
    [form],
  )

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId),
    [classes, classId],
  )

  const loadPage = useCallback(async () => {
    setLoading(true)
    setPageError(null)
    try {
      const [cls, s] = await Promise.all([listClasses(), getSchoolSettings()])
      setClasses(cls)
      setClassId((prev) => {
        if (prev && cls.some((c) => c.id === prev)) return prev
        return cls[0]?.id ?? ''
      })
      setSettings(s ? { ...EMPTY_SETTINGS, ...s } : { ...EMPTY_SETTINGS })
    } catch (err) {
      setPageError(
        err instanceof ApiError ? err.message : 'Could not load reports page.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  async function handleExport() {
    if (!classId) return
    setExportError(null)
    setExportBusy(true)
    try {
      await downloadReport(form, {
        classId,
        month: selectedForm?.needsMonth ? month : undefined,
      })
    } catch {
      setExportError(
        'Download failed. Build tdtd-batch (mvn package) and ensure the API server is running.',
      )
    } finally {
      setExportBusy(false)
    }
  }

  async function handleCompute(quarter: number) {
    if (!classId) return
    setGradesOk(null)
    setComputeBusy(quarter)
    try {
      await computeGrades(classId, quarter)
      await autofillReportCards(classId)
      setGradesOk(quarter)
    } catch (err) {
      setExportError(
        err instanceof ApiError
          ? err.message
          : 'Could not compute grades for this class.',
      )
    } finally {
      setComputeBusy(null)
    }
  }

  async function handleSaveSettings() {
    if (!settings.schoolName.trim()) return
    setSaveBusy(true)
    setSaveOk(false)
    setPageError(null)
    try {
      const saved = await saveSchoolSettings({
        ...settings,
        schoolName: settings.schoolName.trim(),
      })
      setSettings({ ...EMPTY_SETTINGS, ...saved })
      setSaveOk(true)
    } catch (err) {
      setPageError(
        err instanceof ApiError ? err.message : 'Could not save school settings.',
      )
    } finally {
      setSaveBusy(false)
    }
  }

  function updateSetting<K extends keyof SchoolSettings>(
    key: K,
    value: SchoolSettings[K],
  ) {
    setSaveOk(false)
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <PageContainer variant="wide">
      <PageContentReveal>
        <div className="mb-6">
          <Link
            to="/"
            className="text-sm font-medium text-secondary hover:text-teal-700"
          >
            ← Home
          </Link>
        </div>

        <header>
          <h1 className="text-xl font-semibold text-slate-900">
            DepEd official forms
          </h1>
          <p className={`mt-1 max-w-2xl ${bodyMutedClass}`}>
            Configure your school header, compute quarter grades, and export SF1,
            SF2, SF4, SF5, SF9, and SF10 as PDF.
          </p>
        </header>

        {pageError ? (
          <p className={`mt-4 ${errorAlertClass}`} role="alert">
            {pageError}
          </p>
        ) : null}

        {loading ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <FormPanelSkeleton fields={5} />
            <FormPanelSkeleton fields={3} />
          </div>
        ) : classes.length === 0 ? (
          <section className="mt-8 max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">No classes yet</h2>
            <p className={`mt-2 ${bodyMutedClass}`}>
              Register a class and students before exporting DepEd forms.
            </p>
            <Link
              to="/classes"
              className={`mt-4 inline-flex py-3 px-6 ${primaryButtonClass}`}
            >
              Go to Classes
            </Link>
          </section>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
              {/* School settings */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
                <h2 className="font-semibold text-slate-900">School header</h2>
                <p className={`mt-1 ${bodyMutedClass}`}>
                  Printed on every form — region, division, school name, and BEIS
                  ID.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={formLabelClass} htmlFor="school-name">
                      School name <span className="text-accent">*</span>
                    </label>
                    <input
                      id="school-name"
                      type="text"
                      value={settings.schoolName}
                      onChange={(e) => updateSetting('schoolName', e.target.value)}
                      className={`mt-1.5 ${formInputClasses()}`}
                      placeholder="e.g. Mabini Elementary School"
                    />
                  </div>
                  <div>
                    <label className={formLabelClass} htmlFor="school-id">
                      School ID (BEIS)
                    </label>
                    <input
                      id="school-id"
                      type="text"
                      value={settings.schoolId ?? ''}
                      onChange={(e) => updateSetting('schoolId', e.target.value)}
                      className={`mt-1.5 ${formInputClasses()}`}
                    />
                  </div>
                  <div>
                    <label className={formLabelClass} htmlFor="school-head">
                      School head
                    </label>
                    <input
                      id="school-head"
                      type="text"
                      value={settings.schoolHeadName ?? ''}
                      onChange={(e) =>
                        updateSetting('schoolHeadName', e.target.value)
                      }
                      className={`mt-1.5 ${formInputClasses()}`}
                    />
                  </div>
                  <div>
                    <label className={formLabelClass} htmlFor="region">
                      Region
                    </label>
                    <input
                      id="region"
                      type="text"
                      value={settings.region ?? ''}
                      onChange={(e) => updateSetting('region', e.target.value)}
                      className={`mt-1.5 ${formInputClasses()}`}
                    />
                  </div>
                  <div>
                    <label className={formLabelClass} htmlFor="division">
                      Division
                    </label>
                    <input
                      id="division"
                      type="text"
                      value={settings.division ?? ''}
                      onChange={(e) => updateSetting('division', e.target.value)}
                      className={`mt-1.5 ${formInputClasses()}`}
                    />
                  </div>
                  <div>
                    <label className={formLabelClass} htmlFor="district">
                      District
                    </label>
                    <input
                      id="district"
                      type="text"
                      value={settings.district ?? ''}
                      onChange={(e) => updateSetting('district', e.target.value)}
                      className={`mt-1.5 ${formInputClasses()}`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={formLabelClass} htmlFor="school-address">
                      Address
                    </label>
                    <input
                      id="school-address"
                      type="text"
                      value={settings.schoolAddress ?? ''}
                      onChange={(e) =>
                        updateSetting('schoolAddress', e.target.value)
                      }
                      className={`mt-1.5 ${formInputClasses()}`}
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={saveBusy || !settings.schoolName.trim()}
                    onClick={() => void handleSaveSettings()}
                    className={`py-2.5 px-5 ${primaryButtonClass}`}
                  >
                    {saveBusy ? 'Saving…' : 'Save header'}
                  </button>
                  {saveOk ? (
                    <span className="text-sm font-medium text-secondary">
                      Saved
                    </span>
                  ) : null}
                </div>
              </section>

              {/* Export */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
                <h2 className="font-semibold text-slate-900">Export PDF</h2>
                <p className={`mt-1 ${bodyMutedClass}`}>
                  Pick a form, class, and month (if needed), then download.
                </p>

                <div className="mt-5">
                  <span className={formLabelClass}>Form</span>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {FORM_OPTIONS.map((opt) => {
                      const selected = form === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setForm(opt.id)}
                          className={[
                            'rounded-xl border-2 px-4 py-3 text-left transition',
                            selected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                              : 'border-slate-200 bg-white hover:border-secondary/60 hover:bg-teal-50/50',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'text-xs font-bold uppercase tracking-wide',
                              selected ? 'text-primary' : 'text-slate-500',
                            ].join(' ')}
                          >
                            {opt.code}
                          </span>
                          <span className="mt-0.5 block text-sm font-semibold text-slate-900">
                            {opt.title}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {opt.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={formLabelClass} htmlFor="report-class">
                      Class
                    </label>
                    <select
                      id="report-class"
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      className={`mt-1.5 ${formInputClasses()}`}
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {formatClassShiftLabel(c.shift)}
                        </option>
                      ))}
                    </select>
                    {selectedClass ? (
                      <p className="mt-1.5 text-xs text-slate-500">
                        {selectedClass.gradeLevel
                          ? `Grade ${selectedClass.gradeLevel}`
                          : 'Set grade level in class metadata for accurate headers.'}
                        {selectedClass.sectionName
                          ? ` · Section ${selectedClass.sectionName}`
                          : ''}
                      </p>
                    ) : null}
                  </div>

                  {selectedForm?.needsMonth ? (
                    <div>
                      <label className={formLabelClass} htmlFor="report-month">
                        Month
                      </label>
                      <input
                        id="report-month"
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className={`mt-1.5 ${formInputClasses()}`}
                      />
                    </div>
                  ) : null}
                </div>

                {exportError ? (
                  <p className={`mt-4 ${errorAlertClass}`} role="alert">
                    {exportError}
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={exportBusy || !classId}
                  onClick={() => void handleExport()}
                  className={`mt-5 w-full py-3 sm:w-auto sm:px-8 ${primaryButtonClass}`}
                >
                  {exportBusy
                    ? 'Generating PDF…'
                    : `Download ${selectedForm?.code ?? 'form'} PDF`}
                </button>
              </section>
            </div>

            {/* Grades */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">
                Quarter grades &amp; report cards
              </h2>
              <p className={`mt-1 max-w-2xl ${bodyMutedClass}`}>
                Compute grades from score events for the selected class, then
                auto-fill data used on SF9 and SF10. Run this after entering scores
                for each quarter.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={!classId || computeBusy !== null}
                    onClick={() => void handleCompute(q)}
                    className={`min-w-[4.5rem] py-2.5 px-4 ${secondaryButtonClass}`}
                  >
                    {computeBusy === q ? 'Computing…' : `Q${q}`}
                  </button>
                ))}
              </div>

              {gradesOk != null ? (
                <p className="mt-3 text-sm font-medium text-secondary">
                  Quarter {gradesOk} grades computed and report card data updated.
                </p>
              ) : null}
            </section>
          </div>
        )}
      </PageContentReveal>
    </PageContainer>
  )
}
