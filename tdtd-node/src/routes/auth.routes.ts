import { Router } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import {
  changePasswordHandler,
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  resetPasswordHandler,
  signupHandler,
} from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/authenticate.js'

export function authRouter(db: SqliteDatabase): Router {
  const router = Router()
  router.post('/signup', signupHandler(db))
  router.post('/login', loginHandler(db))
  router.post('/refresh', refreshHandler(db))
  router.post('/logout', logoutHandler(db))
  router.post('/forgot-password', forgotPasswordHandler(db))
  router.post('/reset-password', resetPasswordHandler(db))
  router.get('/me', authenticate(db), meHandler(db))
  router.post('/change-password', authenticate(db), changePasswordHandler(db))
  return router
}
