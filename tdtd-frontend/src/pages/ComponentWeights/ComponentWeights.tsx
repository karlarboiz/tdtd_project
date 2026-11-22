import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  activateGradingSystem,
  createGradingSystem,
  defaultBandsWithLabels,
  getGradingSystemWeights,
  listGradingSystems,
  saveGradingSystemWeights,
  type GradingSystemSummary,
  type GradingWeightBand,
} from '@/api/gradingSystemApi'
import { FormPanelSkeleton } from '@/components/LoadingSkeleton/FormPanelSkeleton'
import { PageContainer } from '@/layouts/PageContainer'
import { PageContentReveal } from '@/layouts/PageContentReveal'
import { ApiError } from '@/lib/http'
import { Button } from '@/components/Button/Button'
import {
  bodyMutedClass,
  errorAlertClass,
  formInputClasses,
  formLabelClass,
} from '@/lib/uiClasses'

type EditableBand = Omit<GradingWeightBand, 'ww' | 'pt' | 'qa'> & {
  ww: number | ''
  pt: number | ''
  qa: number | ''
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function rowSum(band: EditableBand): number {
  return round2(Number(band.ww) + Number(band.pt) + Number(band.qa))
}

function validateBands(bands: EditableBand[]): string[] {
  const errors: string[] = []
  if (bands.length !== 3) {
    errors.push('Exactly 3 grade bands are required.')
    return errors
  }
  for (const band of bands) {
    for (const key of ['ww', 'pt', 'qa'] as const) {
      const val = band[key]
      if (val === '' || val === undefined || Number.isNaN(Number(val))) {
        errors.push(`${band.label}: ${key.toUpperCase()} is required.`)
        continue
      }
      const n = Number(val)
      if (n < 0 || n > 100) {
        errors.push(`${band.label}: ${key.toUpperCase()} must be between 0 and 100.`)
      }
    }
    const sum = rowSum(band)
    if (sum !== 100) {
      errors.push(`${band.label}: WW + PT + QA must equal 100 (currently ${sum}).`)
    }
  }
  return errors
}

export function ComponentWeights() {
  const [systems, setSystems] = useState<GradingSystemSummary[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [bands, setBands] = useState<EditableBand[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [activateBusy, setActivateBusy] = useState<string | null>(null)
  const [weightsLoading, setWeightsLoading] = useState(false)

  const validationErrors = useMemo(() => validateBands(bands), [bands])
  const canSave = bands.length === 3 && validationErrors.length === 0 && !saveBusy

  const selectedSystem = useMemo(
    () => systems.find((s) => s.id === selectedId),
    [systems, selectedId],
  )

  const loadWeights = useCallback(async (systemId: string) => {
    setWeightsLoading(true)
    setSaveError(null)
    try {
      const rows = await getGradingSystemWeights(systemId)
      setBands(rows as EditableBand[])
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to load weights')
    } finally {
      setWeightsLoading(false)
    }
  }, [])

  const loadPage = useCallback(async () => {
    setLoading(true)
    setPageError(null)
    try {
      const list = await listGradingSystems()
      setSystems(list)
      const active = list.find((s) => s.isActive) ?? list[0]
      if (active) {
        setSelectedId(active.id)
        await loadWeights(active.id)
      }
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to load grading systems')
    } finally {
      setLoading(false)
    }
  }, [loadWeights])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  async function onSelectSystem(id: string) {
    setSelectedId(id)
    setSaveOk(false)
    await loadWeights(id)
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = createName.trim()
    if (!name) return
    setCreateBusy(true)
    setPageError(null)
    try {
      const created = await createGradingSystem(name)
      setCreateName('')
      const list = await listGradingSystems()
      setSystems(list)
      setSelectedId(created.id)
      await loadWeights(created.id)
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : 'Create failed')
    } finally {
      setCreateBusy(false)
    }
  }

  async function onActivate(id: string) {
    setActivateBusy(id)
    setPageError(null)
    try {
      await activateGradingSystem(id)
      const list = await listGradingSystems()
      setSystems(list)
      setSelectedId(id)
    } catch (err) {
      setPageError(err instanceof ApiError ? err.message : 'Activate failed')
    } finally {
      setActivateBusy(null)
    }
  }

  function updateBand(
    index: number,
    field: 'ww' | 'pt' | 'qa',
    raw: string,
  ) {
    setBands((prev) => {
      const next = [...prev]
      const band = { ...next[index]! }
      band[field] = raw === '' ? '' : Number(raw)
      next[index] = band
      return next
    })
    setSaveOk(false)
  }

  function onResetDefaults() {
    setBands(defaultBandsWithLabels() as EditableBand[])
    setSaveOk(false)
  }

  async function onSave() {
    if (!selectedId || !canSave) return
    setSaveBusy(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      const saved = await saveGradingSystemWeights(
        selectedId,
        bands.map((b) => ({
          ...b,
          ww: Number(b.ww),
          pt: Number(b.pt),
          qa: Number(b.qa),
        })),
      )
      setBands(saved as EditableBand[])
      setSaveOk(true)
      const list = await listGradingSystems()
      setSystems(list)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Save failed')
    } finally {
      setSaveBusy(false)
    }
  }

  if (loading) {
    return (
      <PageContainer variant="wide">
        <PageContentReveal>
          <header>
            <h1 className="text-xl font-semibold text-slate-900">Component Weights</h1>
          </header>
          <FormPanelSkeleton className="mt-8" />
        </PageContentReveal>
      </PageContainer>
    )
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
          <h1 className="text-xl font-semibold text-slate-900">Component Weights</h1>
          <p className={`mt-1 max-w-2xl ${bodyMutedClass}`}>
            Configure WW / PT / QA percentages per grade band. Only one grading system is
            active at a time.
          </p>
        </header>

        {pageError ? (
          <p className={`mt-4 ${errorAlertClass}`} role="alert">
            {pageError}
          </p>
        ) : null}

        <section className="mt-8 mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Grading systems</h2>
          <p className={`mt-1 ${bodyMutedClass}`}>
            Activate one system for grade computation. Create a new system to try alternate
            weight profiles.
          </p>

          <form onSubmit={onCreate} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1">
              <label className={formLabelClass} htmlFor="new-system-name">
                New system name
              </label>
              <input
                id="new-system-name"
                type="text"
                maxLength={120}
                className={formInputClasses()}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. DepEd Memo 2026"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={createBusy || !createName.trim()}
            >
              {createBusy ? 'Creating…' : 'Create from defaults'}
            </Button>
          </form>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-4 font-semibold">Name</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {systems.map((sys) => (
                  <tr
                    key={sys.id}
                    className={[
                      'border-b border-slate-100',
                      sys.id === selectedId ? 'bg-primary/5' : '',
                    ].join(' ')}
                  >
                    <td className="py-3 pr-4 font-medium text-slate-900">{sys.name}</td>
                    <td className="py-3 pr-4">
                      {sys.isActive ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="text-slate-500">Inactive</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => void onSelectSystem(sys.id)}
                        >
                          Edit weights
                        </Button>
                        <Button
                          type="button"
                          disabled={sys.isActive || activateBusy === sys.id}
                          onClick={() => void onActivate(sys.id)}
                        >
                          {activateBusy === sys.id ? 'Activating…' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedSystem ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Weights — {selectedSystem.name}
            </h2>
            <p className={`mt-1 ${bodyMutedClass}`}>
              Each row must total 100%. Values are percentages for Written Work (WW),
              Performance Task (PT), and Quarterly Assessment (QA).
            </p>

            {weightsLoading ? (
              <p className={`mt-4 ${bodyMutedClass}`}>Loading weights…</p>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600">
                        <th className="py-2 pr-4 font-semibold">Grade band</th>
                        <th className="py-2 pr-4 font-semibold">WW (%)</th>
                        <th className="py-2 pr-4 font-semibold">PT (%)</th>
                        <th className="py-2 pr-4 font-semibold">QA (%)</th>
                        <th className="py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bands.map((band, i) => {
                        const sum = rowSum(band)
                        const sumOk = sum === 100
                        return (
                          <tr key={band.gradeBandMin} className="border-b border-slate-100">
                            <td className="py-3 pr-4 font-medium text-slate-900">
                              {band.label}
                            </td>
                            {(['ww', 'pt', 'qa'] as const).map((field) => (
                              <td key={field} className="py-3 pr-4">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  className={formInputClasses({ className: 'w-20' })}
                                  value={band[field]}
                                  onChange={(e) => updateBand(i, field, e.target.value)}
                                  aria-label={`${band.label} ${field.toUpperCase()}`}
                                />
                              </td>
                            ))}
                            <td
                              className={[
                                'py-3 font-semibold tabular-nums',
                                sumOk ? 'text-emerald-700' : 'text-red-600',
                              ].join(' ')}
                            >
                              {Number.isFinite(sum) ? sum : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {validationErrors.length > 0 ? (
                  <ul className={`mt-3 list-inside list-disc text-sm text-red-600`} role="alert">
                    {validationErrors.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                ) : null}

                {saveError ? (
                  <p className={`mt-3 ${errorAlertClass}`} role="alert">
                    {saveError}
                  </p>
                ) : null}

                {saveOk ? (
                  <p className="mt-3 text-sm text-emerald-700" role="status">
                    Weights saved.{' '}
                    <Link to="/reports" className="font-semibold underline">
                      Recompute grades on DepEd Reports
                    </Link>{' '}
                    to apply changes.
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    disabled={!canSave}
                    onClick={() => void onSave()}
                  >
                    {saveBusy ? 'Saving…' : 'Save weights'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onResetDefaults}
                  >
                    Reset to DepEd defaults
                  </Button>
                </div>
              </>
            )}
          </section>
        ) : null}
      </PageContentReveal>
    </PageContainer>
  )
}
