import type { NextFunction, Response } from 'express'
import type { UserRole } from '../schema/types.js'
import type { AuthenticatedRequest } from './authenticate.js'

export function authorize(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  authorize('admin')(req, res, next)
}
