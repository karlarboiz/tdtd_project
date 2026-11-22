import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  assertProductionCorsConfig,
  getCorsMiddlewareOptions,
  isProductionEnv,
  parseCorsOrigins,
} from './cors-config.js'

describe('cors-config', () => {
  const env = process.env

  beforeEach(() => {
    process.env = { ...env }
    delete process.env.TDTD_ENV
    delete process.env.NODE_ENV
    delete process.env.TDTD_CORS_ORIGINS
  })

  it('parseCorsOrigins splits and trims trailing slashes', () => {
    expect(parseCorsOrigins('https://a.com, https://b.com/')).toEqual([
      'https://a.com',
      'https://b.com',
    ])
  })

  it('isProductionEnv respects TDTD_ENV', () => {
    process.env.TDTD_ENV = 'production'
    expect(isProductionEnv()).toBe(true)
    process.env.TDTD_ENV = 'development'
    expect(isProductionEnv()).toBe(false)
  })

  it('isProductionEnv falls back to NODE_ENV', () => {
    process.env.NODE_ENV = 'production'
    expect(isProductionEnv()).toBe(true)
  })

  it('assertProductionCorsConfig throws when prod without origins', () => {
    process.env.TDTD_ENV = 'production'
    expect(() => assertProductionCorsConfig()).toThrow(/TDTD_CORS_ORIGINS/)
  })

  it('assertProductionCorsConfig passes when prod with origins', () => {
    process.env.TDTD_ENV = 'production'
    process.env.TDTD_CORS_ORIGINS = 'https://app.example.com'
    expect(() => assertProductionCorsConfig()).not.toThrow()
  })

  it('getCorsMiddlewareOptions uses reflect-all when allowlist empty', () => {
    const opts = getCorsMiddlewareOptions()
    expect(opts.origin).toBe(true)
  })

  it('getCorsMiddlewareOptions rejects unknown origins', () => {
    process.env.TDTD_CORS_ORIGINS = 'https://app.example.com'
    const opts = getCorsMiddlewareOptions()
    expect(typeof opts.origin).toBe('function')

    const cb = vi.fn()
    ;(opts.origin as (origin: string | undefined, callback: typeof cb) => void)(
      'https://evil.example.com',
      cb,
    )
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('CORS origin not allowed') }))
  })

  it('getCorsMiddlewareOptions allows listed origin', () => {
    process.env.TDTD_CORS_ORIGINS = 'https://app.example.com'
    const opts = getCorsMiddlewareOptions()
    const cb = vi.fn()
    ;(opts.origin as (origin: string | undefined, callback: typeof cb) => void)(
      'https://app.example.com',
      cb,
    )
    expect(cb).toHaveBeenCalledWith(null, true)
  })
})
