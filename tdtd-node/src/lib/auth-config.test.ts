import { beforeEach, describe, expect, it } from 'vitest'
import {
  assertProductionSecrets,
  DEV_ACCESS_SECRET,
  DEV_REFRESH_PEPPER,
} from './auth-config.js'

describe('auth-config', () => {
  const env = process.env

  beforeEach(() => {
    process.env = { ...env }
    delete process.env.TDTD_ENV
    delete process.env.NODE_ENV
    delete process.env.TDTD_JWT_ACCESS_SECRET
    delete process.env.TDTD_REFRESH_TOKEN_PEPPER
  })

  it('assertProductionSecrets is a no-op outside production', () => {
    process.env.TDTD_ENV = 'development'
    expect(() => assertProductionSecrets()).not.toThrow()
  })

  it('assertProductionSecrets throws when access secret missing in production', () => {
    process.env.TDTD_ENV = 'production'
    process.env.TDTD_REFRESH_TOKEN_PEPPER = 'x'.repeat(32)
    expect(() => assertProductionSecrets()).toThrow(/TDTD_JWT_ACCESS_SECRET/)
  })

  it('assertProductionSecrets throws when refresh pepper missing in production', () => {
    process.env.TDTD_ENV = 'production'
    process.env.TDTD_JWT_ACCESS_SECRET = 'x'.repeat(32)
    expect(() => assertProductionSecrets()).toThrow(/TDTD_REFRESH_TOKEN_PEPPER/)
  })

  it('assertProductionSecrets throws when dev placeholder access secret used in production', () => {
    process.env.TDTD_ENV = 'production'
    process.env.TDTD_JWT_ACCESS_SECRET = DEV_ACCESS_SECRET
    process.env.TDTD_REFRESH_TOKEN_PEPPER = 'x'.repeat(32)
    expect(() => assertProductionSecrets()).toThrow(/TDTD_JWT_ACCESS_SECRET/)
  })

  it('assertProductionSecrets throws when dev placeholder refresh pepper used in production', () => {
    process.env.TDTD_ENV = 'production'
    process.env.TDTD_JWT_ACCESS_SECRET = 'x'.repeat(32)
    process.env.TDTD_REFRESH_TOKEN_PEPPER = DEV_REFRESH_PEPPER
    expect(() => assertProductionSecrets()).toThrow(/TDTD_REFRESH_TOKEN_PEPPER/)
  })

  it('assertProductionSecrets throws when secrets are too short in production', () => {
    process.env.TDTD_ENV = 'production'
    process.env.TDTD_JWT_ACCESS_SECRET = 'short'
    process.env.TDTD_REFRESH_TOKEN_PEPPER = 'also-short'
    expect(() => assertProductionSecrets()).toThrow(/TDTD_JWT_ACCESS_SECRET/)
  })

  it('assertProductionSecrets passes with strong unique secrets in production', () => {
    process.env.TDTD_ENV = 'production'
    process.env.TDTD_JWT_ACCESS_SECRET = 'x'.repeat(32)
    process.env.TDTD_REFRESH_TOKEN_PEPPER = 'y'.repeat(32)
    expect(() => assertProductionSecrets()).not.toThrow()
  })

  it('assertProductionSecrets respects NODE_ENV=production when TDTD_ENV unset', () => {
    process.env.NODE_ENV = 'production'
    expect(() => assertProductionSecrets()).toThrow(/TDTD_JWT_ACCESS_SECRET/)
  })
})
