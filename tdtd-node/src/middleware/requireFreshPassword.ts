import type { NextFunction, Response } from 'express'
import type { AuthenticatedRequest } from './authenticate.js'

export function requireFreshPassword() {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (req.auth?.mustChangePassword) {
      res.status(403).json({
        error: 'Password expired',
        code: 'PASSWORD_EXPIRED',
      })
      return
    }
    next()
  }
}
