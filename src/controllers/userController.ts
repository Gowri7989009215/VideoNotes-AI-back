import type { Response } from 'express'
import type { AuthRequest } from '../middlewares/auth'
import { findUserById } from '../models/user'

export const getMe = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  const user = await findUserById(req.user.id)
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    isVerified: user.is_verified
  })
}

