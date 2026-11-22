import type { SqliteDatabase } from '../db/sqlite-types.js'
import type {
  GradingComponentWeightRow,
  GradingSystemRow,
} from '../schema/types.js'
import { GRADING_SYSTEM_QUERIES } from '../queries/gradingSystem.queries.js'

type SystemDbRow = {
  id: string
  user_id: string
  name: string
  is_active: number
  created_at: number
  updated_at: number
}

type WeightDbRow = {
  id: string
  grading_system_id: string
  grade_band_min: number
  grade_band_max: number
  ww_weight: number
  pt_weight: number
  qa_weight: number
}

function mapSystem(r: SystemDbRow): GradingSystemRow {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function mapWeight(r: WeightDbRow): GradingComponentWeightRow {
  return {
    id: r.id,
    gradingSystemId: r.grading_system_id,
    gradeBandMin: r.grade_band_min,
    gradeBandMax: r.grade_band_max,
    wwWeight: r.ww_weight,
    ptWeight: r.pt_weight,
    qaWeight: r.qa_weight,
  }
}

export function listGradingSystems(db: SqliteDatabase, userId: string): GradingSystemRow[] {
  const rows = db.prepare(GRADING_SYSTEM_QUERIES.list).all(userId) as SystemDbRow[]
  return rows.map(mapSystem)
}

export function getGradingSystemById(
  db: SqliteDatabase,
  id: string,
  userId: string,
): GradingSystemRow | undefined {
  const row = db
    .prepare(GRADING_SYSTEM_QUERIES.getById)
    .get({ id, user_id: userId }) as SystemDbRow | undefined
  return row ? mapSystem(row) : undefined
}

export function getActiveGradingSystem(
  db: SqliteDatabase,
  userId: string,
): GradingSystemRow | undefined {
  const row = db.prepare(GRADING_SYSTEM_QUERIES.getActive).get(userId) as
    | SystemDbRow
    | undefined
  return row ? mapSystem(row) : undefined
}

export function gradingSystemNameExists(
  db: SqliteDatabase,
  userId: string,
  name: string,
  excludeId?: string,
): boolean {
  const row = db.prepare(GRADING_SYSTEM_QUERIES.nameExists).get({
    user_id: userId,
    name,
    exclude_id: excludeId ?? null,
  })
  return row !== undefined
}

export function insertGradingSystem(
  db: SqliteDatabase,
  row: GradingSystemRow,
): GradingSystemRow {
  db.prepare(GRADING_SYSTEM_QUERIES.insert).run({
    id: row.id,
    user_id: row.userId,
    name: row.name,
    is_active: row.isActive ? 1 : 0,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  })
  return row
}

export function activateGradingSystem(
  db: SqliteDatabase,
  userId: string,
  id: string,
  updatedAt: number,
): void {
  const tx = db.transaction(() => {
    db.prepare(GRADING_SYSTEM_QUERIES.deactivateAll).run({
      user_id: userId,
      updated_at: updatedAt,
    })
    db.prepare(GRADING_SYSTEM_QUERIES.activate).run({
      id,
      user_id: userId,
      updated_at: updatedAt,
    })
  })
  tx()
}

export function listWeightsBySystemId(
  db: SqliteDatabase,
  gradingSystemId: string,
): GradingComponentWeightRow[] {
  const rows = db
    .prepare(GRADING_SYSTEM_QUERIES.listWeightsBySystem)
    .all({ grading_system_id: gradingSystemId }) as WeightDbRow[]
  return rows.map(mapWeight)
}

export function listWeightsForActiveSystem(
  db: SqliteDatabase,
  userId: string,
): GradingComponentWeightRow[] {
  const rows = db
    .prepare(GRADING_SYSTEM_QUERIES.listWeightsForActiveSystem)
    .all(userId) as WeightDbRow[]
  return rows.map(mapWeight)
}

export function replaceWeightsForSystem(
  db: SqliteDatabase,
  gradingSystemId: string,
  weights: GradingComponentWeightRow[],
): void {
  const tx = db.transaction(() => {
    db.prepare(GRADING_SYSTEM_QUERIES.deleteWeightsForSystem).run({
      grading_system_id: gradingSystemId,
    })
    const insert = db.prepare(GRADING_SYSTEM_QUERIES.insertWeight)
    for (const w of weights) {
      insert.run({
        id: w.id,
        grading_system_id: w.gradingSystemId,
        grade_band_min: w.gradeBandMin,
        grade_band_max: w.gradeBandMax,
        ww_weight: w.wwWeight,
        pt_weight: w.ptWeight,
        qa_weight: w.qaWeight,
      })
    }
  })
  tx()
}

export function touchGradingSystemUpdatedAt(
  db: SqliteDatabase,
  userId: string,
  id: string,
  updatedAt: number,
): void {
  db.prepare(GRADING_SYSTEM_QUERIES.touchUpdatedAt).run({
    id,
    user_id: userId,
    updated_at: updatedAt,
  })
}
