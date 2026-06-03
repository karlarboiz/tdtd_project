import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  signupHandler,
} from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/authenticate.js'

export function authRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.post('/signup', signupHandler(db))
  router.post('/login', loginHandler(db))
  router.post('/refresh', refreshHandler(db))
  router.post('/logout', logoutHandler(db))
  router.get('/me', authenticate(db), meHandler(db))
  return router
}
