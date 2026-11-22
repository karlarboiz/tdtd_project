/** DepEd transmutation: initial grade (0–100) → transmuted grade (60–100). */

type TransmutationBand = { min: number; max: number; grade: number }

/** Official DepEd transmutation bands (TeacherPH / DepEd K–12 table). */
const TRANSMUTATION_BANDS: TransmutationBand[] = [
  { min: 98.4, max: 99.99, grade: 99 },
  { min: 96.8, max: 98.39, grade: 98 },
  { min: 95.2, max: 96.79, grade: 97 },
  { min: 93.6, max: 95.19, grade: 96 },
  { min: 92.0, max: 93.59, grade: 95 },
  { min: 90.4, max: 91.99, grade: 94 },
  { min: 88.8, max: 90.39, grade: 93 },
  { min: 87.2, max: 88.79, grade: 92 },
  { min: 85.6, max: 87.19, grade: 91 },
  { min: 84.0, max: 85.59, grade: 90 },
  { min: 82.4, max: 83.99, grade: 89 },
  { min: 80.8, max: 82.39, grade: 88 },
  { min: 79.2, max: 80.79, grade: 87 },
  { min: 77.6, max: 79.19, grade: 86 },
  { min: 76.0, max: 77.59, grade: 85 },
  { min: 74.4, max: 75.99, grade: 84 },
  { min: 72.8, max: 74.39, grade: 83 },
  { min: 71.2, max: 72.79, grade: 82 },
  { min: 69.6, max: 71.19, grade: 81 },
  { min: 68.0, max: 69.59, grade: 80 },
  { min: 66.4, max: 67.99, grade: 79 },
  { min: 64.8, max: 66.39, grade: 78 },
  { min: 63.2, max: 64.79, grade: 77 },
  { min: 61.6, max: 63.19, grade: 76 },
  { min: 60.0, max: 61.59, grade: 75 },
  { min: 56.0, max: 59.99, grade: 74 },
  { min: 52.0, max: 55.99, grade: 73 },
  { min: 48.0, max: 51.99, grade: 72 },
  { min: 44.0, max: 47.99, grade: 71 },
  { min: 40.0, max: 43.99, grade: 70 },
  { min: 36.0, max: 39.99, grade: 69 },
  { min: 32.0, max: 35.99, grade: 68 },
  { min: 28.0, max: 31.99, grade: 67 },
  { min: 24.0, max: 27.99, grade: 66 },
  { min: 20.0, max: 23.99, grade: 65 },
  { min: 16.0, max: 19.99, grade: 64 },
  { min: 12.0, max: 15.99, grade: 63 },
  { min: 8.0, max: 11.99, grade: 62 },
  { min: 4.0, max: 7.99, grade: 61 },
  { min: 0, max: 3.99, grade: 60 },
]

export function transmuteRawPercent(raw: number): number {
  if (raw >= 100) return 100
  if (raw < 0) return 60
  for (const band of TRANSMUTATION_BANDS) {
    if (raw >= band.min && raw <= band.max) return band.grade
  }
  return 60
}

export function descriptorForGrade(grade: number): string {
  if (grade >= 90) return 'Outstanding (O)'
  if (grade >= 85) return 'Very Satisfactory (VS)'
  if (grade >= 80) return 'Satisfactory (S)'
  if (grade >= 75) return 'Fairly Satisfactory (FS)'
  return 'Did Not Meet Expectations (D)'
}

/** Default WW/PT/QA weights by grade band. */
export function defaultWeights(gradeLevel: string): { ww: number; pt: number; qa: number } {
  const g = parseInt(gradeLevel.replace(/\D/g, ''), 10)
  if (Number.isNaN(g) || g <= 6) return { ww: 0.3, pt: 0.5, qa: 0.2 }
  if (g <= 10) return { ww: 0.4, pt: 0.4, qa: 0.2 }
  return { ww: 0.25, pt: 0.5, qa: 0.25 }
}

export function promotionStatusForGa(ga: number): 'PROMOTED' | 'CONDITIONAL' | 'RETAINED' {
  if (ga >= 75) return 'PROMOTED'
  if (ga >= 70) return 'CONDITIONAL'
  return 'RETAINED'
}
