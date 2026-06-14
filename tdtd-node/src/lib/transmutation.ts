/** DepEd transmutation: raw percentage → 60–100 scale (simplified linear bands). */

export function transmuteRawPercent(raw: number): number {
  if (raw >= 100) return 100
  if (raw <= 0) return 60
  // Linear map 0–100 → 60–100
  const grade = 60 + (raw / 100) * 40
  return Math.round(Math.min(100, Math.max(60, grade)))
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
