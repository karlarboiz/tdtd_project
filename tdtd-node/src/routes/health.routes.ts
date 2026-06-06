import { Router } from 'express'

export function healthRouter(): Router {
  const router = Router()
  router.get('/', (_req, res) => {
    res.json({ ok: true, service: 'tdtd-node' })
  })
  return router
}
