import { randomUUID } from 'node:crypto'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import type {
  GradingComponentWeightRow,
  GradingSystemRow,
  GradingWeightBandDisplay,
  GradingWeightBandInput,
} from '../schema/types.js'
import { HttpError } from '../errors/http-error.js'
import * as dao from '../dao/gradingSystem.dao.js'
import {
  DEFAULT_WEIGHT_BANDS,
  fractionToPercent,
  gradeBandLabel,
  percentToFraction,
  validateWeightBands,
} from '../lib/gradingWeights.js'

export type GradingSystemSummary = {
  id: string
  name: string
  isActive: boolean
  updatedAt: number
}

function toSummary(row: GradingSystemRow): GradingSystemSummary {
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    updatedAt: row.updatedAt,
  }
}

function toDisplayBands(weights: GradingComponentWeightRow[]): GradingWeightBandDisplay[] {
  return weights.map((w) => ({
    gradeBandMin: w.gradeBandMin,
    gradeBandMax: w.gradeBandMax,
    label: gradeBandLabel(w.gradeBandMin, w.gradeBandMax),
    ww: fractionToPercent(w.wwWeight),
    pt: fractionToPercent(w.ptWeight),
    qa: fractionToPercent(w.qaWeight),
  }))
}

function assertValidBands(bands: GradingWeightBandInput[]): void {
  const errors = validateWeightBands(bands)
  if (errors.length > 0) {
    throw new HttpError(400, errors.map((e) => e.message).join('; '), 'VALIDATION_ERROR')
  }
}

function bandsToRows(
  gradingSystemId: string,
  bands: GradingWeightBandInput[],
): GradingComponentWeightRow[] {
  return bands.map((b) => ({
    id: randomUUID(),
    gradingSystemId,
    gradeBandMin: b.gradeBandMin,
    gradeBandMax: b.gradeBandMax,
    wwWeight: percentToFraction(b.ww),
    ptWeight: percentToFraction(b.pt),
    qaWeight: percentToFraction(b.qa),
  }))
}

export function listGradingSystems(
  db: SqliteDatabase,
  userId: string,
): GradingSystemSummary[] {
  return dao.listGradingSystems(db, userId).map(toSummary)
}

export function createGradingSystem(
  db: SqliteDatabase,
  userId: string,
  name: string,
): GradingSystemSummary {
  const trimmed = name?.trim()
  if (!trimmed) throw new HttpError(400, 'name is required')
  if (trimmed.length > 120) throw new HttpError(400, 'name must be at most 120 characters')
  if (dao.gradingSystemNameExists(db, userId, trimmed)) {
    throw new HttpError(409, 'A grading system with this name already exists')
  }

  const now = Date.now()
  const row: GradingSystemRow = {
    id: randomUUID(),
    userId,
    name: trimmed,
    isActive: false,
    createdAt: now,
    updatedAt: now,
  }
  dao.insertGradingSystem(db, row)
  dao.replaceWeightsForSystem(db, row.id, bandsToRows(row.id, DEFAULT_WEIGHT_BANDS))
  return toSummary(row)
}

export function activateGradingSystem(
  db: SqliteDatabase,
  userId: string,
  id: string,
): GradingSystemSummary {
  const system = dao.getGradingSystemById(db, id, userId)
  if (!system) throw new HttpError(404, 'grading system not found')

  const weights = dao.listWeightsBySystemId(db, id)
  const display = weights.map((w) => ({
    gradeBandMin: w.gradeBandMin,
    gradeBandMax: w.gradeBandMax,
    ww: fractionToPercent(w.wwWeight),
    pt: fractionToPercent(w.ptWeight),
    qa: fractionToPercent(w.qaWeight),
  }))
  assertValidBands(display)

  const now = Date.now()
  dao.activateGradingSystem(db, userId, id, now)
  return toSummary({ ...system, isActive: true, updatedAt: now })
}

export function getGradingSystemWeights(
  db: SqliteDatabase,
  userId: string,
  id: string,
): GradingWeightBandDisplay[] {
  const system = dao.getGradingSystemById(db, id, userId)
  if (!system) throw new HttpError(404, 'grading system not found')
  const weights = dao.listWeightsBySystemId(db, id)
  if (weights.length === 0) {
    return DEFAULT_WEIGHT_BANDS.map((b) => ({
      ...b,
      label: gradeBandLabel(b.gradeBandMin, b.gradeBandMax),
    }))
  }
  return toDisplayBands(weights)
}

export function saveGradingSystemWeights(
  db: SqliteDatabase,
  userId: string,
  id: string,
  bands: GradingWeightBandInput[],
): GradingWeightBandDisplay[] {
  const system = dao.getGradingSystemById(db, id, userId)
  if (!system) throw new HttpError(404, 'grading system not found')

  assertValidBands(bands)
  dao.replaceWeightsForSystem(db, id, bandsToRows(id, bands))

  const now = Date.now()
  dao.touchGradingSystemUpdatedAt(db, userId, id, now)

  return getGradingSystemWeights(db, userId, id)
}
