import type { Request, Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { HttpError } from '../errors/http-error.js'
import type { AuthenticatedRequest } from '../middleware/authenticate.js'
import * as authService from '../services/auth.service.js'

function handleAuthError(res: Response, e: unknown): void {
  if (e instanceof HttpError) {
    const body: { error: string; code?: string } = { error: e.message }
    if (e.code) body.code = e.code
    res.status(e.statusCode).json(body)
    return
  }
  console.error(e)
  res.status(500).json({ error: 'internal server error' })
}

export function signupHandler(db: SqliteDatabase) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      res.status(201).json(await authService.signup(db, req.body))
    } catch (e) {
      handleAuthError(res, e)
    }
  }
}

export function loginHandler(db: SqliteDatabase) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(await authService.login(db, req.body))
    } catch (e) {
      handleAuthError(res, e)
    }
  }
}

export function refreshHandler(db: SqliteDatabase) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(await authService.refreshSession(db, req.body))
    } catch (e) {
      handleAuthError(res, e)
    }
  }
}

export function logoutHandler(db: SqliteDatabase) {
  return (req: Request, res: Response): void => {
    try {
      authService.logout(db, req.body)
      res.status(204).send()
    } catch (e) {
      handleAuthError(res, e)
    }
  }
}

export function meHandler(db: SqliteDatabase) {
  return (req: AuthenticatedRequest, res: Response): void => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      res.json(authService.getMe(db, req.auth.id))
    } catch (e) {
      handleAuthError(res, e)
    }
  }
}

export function changePasswordHandler(db: SqliteDatabase) {
  return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.auth) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      res.json(await authService.changePassword(db, req.auth.id, req.body))
    } catch (e) {
      handleAuthError(res, e)
    }
  }
}

export function forgotPasswordHandler(db: SqliteDatabase) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await authService.forgotPassword(db, req.body)
      res.status(204).send()
    } catch (e) {
      handleAuthError(res, e)
    }
  }
}

export function resetPasswordHandler(db: SqliteDatabase) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(await authService.resetPassword(db, req.body))
    } catch (e) {
      handleAuthError(res, e)
    }
  }
}
