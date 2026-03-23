import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
  }
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' })
  }
  const token = authHeader.slice('Bearer '.length)
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string; email: string }
    req.user = { id: payload.userId, email: payload.email }
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

