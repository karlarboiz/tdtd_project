import type { SqliteDatabase } from '../db/sqlite-types.js'
import type { GradingWeightBandInput } from '../schema/types.js'
import { defaultWeights } from './transmutation.js'
import * as gradingDao from '../dao/gradingSystem.dao.js'

export type ComponentWeightFractions = { ww: number; pt: number; qa: number }

/** Canonical DepEd K–12 default bands (display percents). */
export const DEFAULT_WEIGHT_BANDS: GradingWeightBandInput[] = [
  { gradeBandMin: 1, gradeBandMax: 6, ww: 30, pt: 50, qa: 20 },
  { gradeBandMin: 7, gradeBandMax: 10, ww: 40, pt: 40, qa: 20 },
  { gradeBandMin: 11, gradeBandMax: 12, ww: 25, pt: 50, qa: 25 },
]

export const REQUIRED_BAND_RANGES = DEFAULT_WEIGHT_BANDS.map((b) => ({
  min: b.gradeBandMin,
  max: b.gradeBandMax,
}))

export function gradeBandLabel(min: number, max: number): string {
  return `Grades ${min}–${max}`
}

/** Parse numeric grade from class grade_level string (same rules as defaultWeights). */
export function parseGradeFromLevel(gradeLevel: string): number {
  const g = parseInt(gradeLevel.replace(/\D/g, ''), 10)
  return Number.isNaN(g) ? 6 : g
}

export function bandForGrade(grade: number): { min: number; max: number } {
  if (grade <= 6) return { min: 1, max: 6 }
  if (grade <= 10) return { min: 7, max: 10 }
  return { min: 11, max: 12 }
}

export function resolveComponentWeights(
  db: SqliteDatabase,
  gradeLevel: string,
): ComponentWeightFractions {
  const grade = parseGradeFromLevel(gradeLevel)
  const { min, max } = bandForGrade(grade)
  const rows = gradingDao.listWeightsForActiveSystem(db)
  const match = rows.find((r) => r.gradeBandMin === min && r.gradeBandMax === max)
  if (match) {
    return { ww: match.wwWeight, pt: match.ptWeight, qa: match.qaWeight }
  }
  return defaultWeights(gradeLevel)
}

export type WeightValidationError = {
  field: string
  message: string
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Validate weight band inputs (display percents 0–100). */
export function validateWeightBands(
  bands: GradingWeightBandInput[] | undefined,
): WeightValidationError[] {
  const errors: WeightValidationError[] = []
  if (!Array.isArray(bands) || bands.length !== REQUIRED_BAND_RANGES.length) {
    errors.push({
      field: 'bands',
      message: `Exactly ${REQUIRED_BAND_RANGES.length} grade bands are required`,
    })
    return errors
  }

  for (let i = 0; i < REQUIRED_BAND_RANGES.length; i++) {
    const expected = REQUIRED_BAND_RANGES[i]!
    const band = bands[i]
    const prefix = `bands[${i}]`

    if (!band) {
      errors.push({ field: prefix, message: 'Band row is required' })
      continue
    }

    if (band.gradeBandMin !== expected.min || band.gradeBandMax !== expected.max) {
      errors.push({
        field: prefix,
        message: `Expected grade band ${expected.min}–${expected.max}`,
      })
    }

    for (const key of ['ww', 'pt', 'qa'] as const) {
      const val = band[key]
      if (val === undefined || val === null || Number.isNaN(Number(val))) {
        errors.push({ field: `${prefix}.${key}`, message: `${key.toUpperCase()} is required` })
        continue
      }
      const n = Number(val)
      if (n < 0 || n > 100) {
        errors.push({
          field: `${prefix}.${key}`,
          message: `${key.toUpperCase()} must be between 0 and 100`,
        })
      }
    }

    const sum = round2(Number(band.ww) + Number(band.pt) + Number(band.qa))
    if (sum !== 100) {
      errors.push({
        field: `${prefix}.sum`,
        message: `WW + PT + QA must equal 100 (got ${sum})`,
      })
    }
  }

  return errors
}

export function percentToFraction(percent: number): number {
  return percent / 100
}

export function fractionToPercent(fraction: number): number {
  return Math.round(fraction * 10000) / 100
}
