import type { NextFunction, Request, Response } from 'express'
import type { SqliteDatabase } from '../db/sqlite-types.js'
import { HttpError } from '../errors/http-error.js'
import * as userDao from '../dao/user.dao.js'
import { verifyAccessToken } from '../lib/tokens.js'
import { toAuthUser } from '../services/auth.service.js'
import type { AuthUser } from '../schema/types.js'

export type AuthenticatedRequest = Request & {
  auth?: AuthUser
}

export function authenticate(db: SqliteDatabase) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const header = req.headers.authorization
      if (!header?.startsWith('Bearer ')) {
        throw new HttpError(401, 'Unauthorized')
      }
      const token = header.slice('Bearer '.length).trim()
      if (!token) {
        throw new HttpError(401, 'Unauthorized')
      }

      const claims = await verifyAccessToken(token)
      const user = userDao.findUserById(db, claims.sub)
      if (!user || !user.isActive) {
        throw new HttpError(401, 'Unauthorized')
      }
      if (user.role !== claims.role) {
        throw new HttpError(401, 'Unauthorized')
      }

      req.auth = toAuthUser(user)
      next()
    } catch (e) {
      if (e instanceof HttpError) {
        const body: { error: string; code?: string } = { error: e.message }
        if (e.code) body.code = e.code
        res.status(e.statusCode).json(body)
        return
      }
      res.status(401).json({ error: 'Unauthorized' })
    }
  }
}
