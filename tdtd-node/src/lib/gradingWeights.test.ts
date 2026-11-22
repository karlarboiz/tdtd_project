import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { migrate } from '../db/migrate.js'
import { createTestUser } from '../test/testUser.js'
import {
  DEFAULT_WEIGHT_BANDS,
  bandForGrade,
  parseGradeFromLevel,
  resolveComponentWeights,
  validateWeightBands,
} from './gradingWeights.js'
import * as gradingService from '../services/gradingSystem.service.js'
import { HttpError } from '../errors/http-error.js'

describe('gradingWeights', () => {
  let db: SqliteDatabase
  let userId: string

  beforeEach(async () => {
    db = new Database(':memory:') as SqliteDatabase
    db.pragma('foreign_keys = ON')
    migrate(db)
    userId = await createTestUser(db, `grading-${Date.now()}@example.com`)
  })

  afterEach(() => {
    db.close()
  })

  describe('parseGradeFromLevel', () => {
    it('parses numeric grade from string', () => {
      expect(parseGradeFromLevel('Grade 7')).toBe(7)
      expect(parseGradeFromLevel('10')).toBe(10)
    })

    it('defaults to 6 when unparseable', () => {
      expect(parseGradeFromLevel('Unspecified')).toBe(6)
    })
  })

  describe('bandForGrade', () => {
    it('maps grades to bands', () => {
      expect(bandForGrade(5)).toEqual({ min: 1, max: 6 })
      expect(bandForGrade(8)).toEqual({ min: 7, max: 10 })
      expect(bandForGrade(12)).toEqual({ min: 11, max: 12 })
    })
  })

  describe('validateWeightBands', () => {
    it('accepts valid default bands', () => {
      expect(validateWeightBands(DEFAULT_WEIGHT_BANDS)).toEqual([])
    })

    it('rejects wrong row count', () => {
      const errors = validateWeightBands([DEFAULT_WEIGHT_BANDS[0]!])
      expect(errors.some((e) => e.field === 'bands')).toBe(true)
    })

    it('rejects out-of-range weight', () => {
      const bad = DEFAULT_WEIGHT_BANDS.map((b) => ({ ...b }))
      bad[0] = { ...bad[0]!, ww: 101 }
      const errors = validateWeightBands(bad)
      expect(errors.some((e) => e.field.includes('ww'))).toBe(true)
    })

    it('rejects row sum not equal to 100', () => {
      const bad = DEFAULT_WEIGHT_BANDS.map((b) => ({ ...b }))
      bad[1] = { ...bad[1]!, ww: 30, pt: 30, qa: 30 }
      const errors = validateWeightBands(bad)
      expect(errors.some((e) => e.field.includes('sum'))).toBe(true)
    })
  })

  describe('resolveComponentWeights', () => {
    it('returns seeded active system weights for grade 7', () => {
      const w = resolveComponentWeights(db, userId, 'Grade 7')
      expect(w).toEqual({ ww: 0.4, pt: 0.4, qa: 0.2 })
    })

    it('returns grade 11 band weights', () => {
      const w = resolveComponentWeights(db, userId, '11')
      expect(w).toEqual({ ww: 0.25, pt: 0.5, qa: 0.25 })
    })

    it('uses custom weights after save on active system', () => {
      const systems = gradingService.listGradingSystems(db, userId)
      const active = systems.find((s) => s.isActive)!
      const custom = DEFAULT_WEIGHT_BANDS.map((b) => ({
        ...b,
        ww: b.gradeBandMin === 7 ? 50 : b.ww,
        pt: b.gradeBandMin === 7 ? 30 : b.pt,
        qa: b.gradeBandMin === 7 ? 20 : b.qa,
      }))
      gradingService.saveGradingSystemWeights(db, userId, active.id, custom)
      const w = resolveComponentWeights(db, userId, 'Grade 8')
      expect(w).toEqual({ ww: 0.5, pt: 0.3, qa: 0.2 })
    })
  })

  describe('gradingSystem.service validation', () => {
    it('rejects save when sum is not 100', () => {
      const systems = gradingService.listGradingSystems(db, userId)
      const active = systems[0]!
      const bad = DEFAULT_WEIGHT_BANDS.map((b) => ({ ...b, ww: 30, pt: 30, qa: 30 }))
      expect(() =>
        gradingService.saveGradingSystemWeights(db, userId, active.id, bad),
      ).toThrow(HttpError)
    })

    it('creates a new inactive system with default weights', () => {
      const created = gradingService.createGradingSystem(db, userId, 'Custom 2026')
      expect(created.isActive).toBe(false)
      const weights = gradingService.getGradingSystemWeights(db, userId, created.id)
      expect(weights).toHaveLength(3)
      expect(weights[0]!.ww).toBe(30)
    })
  })
})
