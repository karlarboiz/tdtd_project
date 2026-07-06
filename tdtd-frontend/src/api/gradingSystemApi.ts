import { apiJson } from '@/lib/http'

export type GradingSystemSummary = {
  id: string
  name: string
  isActive: boolean
  updatedAt: number
}

export type GradingWeightBand = {
  gradeBandMin: number
  gradeBandMax: number
  label: string
  ww: number
  pt: number
  qa: number
}

export function listGradingSystems() {
  return apiJson<GradingSystemSummary[]>('/api/deped/grading-systems')
}

export function createGradingSystem(name: string) {
  return apiJson<GradingSystemSummary>('/api/deped/grading-systems', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function activateGradingSystem(id: string) {
  return apiJson<GradingSystemSummary>(`/api/deped/grading-systems/${id}/activate`, {
    method: 'PATCH',
  })
}

export function getGradingSystemWeights(id: string) {
  return apiJson<GradingWeightBand[]>(`/api/deped/grading-systems/${id}/weights`)
}

export function saveGradingSystemWeights(id: string, bands: GradingWeightBand[]) {
  return apiJson<GradingWeightBand[]>(`/api/deped/grading-systems/${id}/weights`, {
    method: 'PUT',
    body: JSON.stringify({
      bands: bands.map(({ gradeBandMin, gradeBandMax, ww, pt, qa }) => ({
        gradeBandMin,
        gradeBandMax,
        ww,
        pt,
        qa,
      })),
    }),
  })
}

/** Canonical DepEd K–12 default bands for reset. */
export const DEFAULT_WEIGHT_BANDS: Omit<GradingWeightBand, 'label'>[] = [
  { gradeBandMin: 1, gradeBandMax: 6, ww: 30, pt: 50, qa: 20 },
  { gradeBandMin: 7, gradeBandMax: 10, ww: 40, pt: 40, qa: 20 },
  { gradeBandMin: 11, gradeBandMax: 12, ww: 25, pt: 50, qa: 25 },
]

export function defaultBandsWithLabels(): GradingWeightBand[] {
  return DEFAULT_WEIGHT_BANDS.map((b) => ({
    ...b,
    label: `Grades ${b.gradeBandMin}–${b.gradeBandMax}`,
  }))
}
