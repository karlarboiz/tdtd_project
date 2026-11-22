import { describe, expect, it } from 'vitest'
import express from 'express'
import { healthRouter } from './health.routes.js'

async function getHealthJson(): Promise<{ status: number; body: unknown }> {
  const app = express()
  app.use('/health', healthRouter())

  const server = app.listen(0)
  try {
    const addr = server.address()
    const port = typeof addr === 'object' && addr ? addr.port : 0
    const res = await fetch(`http://127.0.0.1:${port}/health`)
    return { status: res.status, body: await res.json() }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    })
  }
}

describe('healthRouter', () => {
  it('returns ok payload', async () => {
    const { status, body } = await getHealthJson()
    expect(status).toBe(200)
    expect(body).toEqual({ ok: true, service: 'tdtd-node' })
  })
})
