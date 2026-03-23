import type { Request, Response } from 'express'
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmail
} from '../services/authService'

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' })
  }
  try {
    await registerUser(name, email, password)
    return res.status(201).json({ message: 'Registered. Please verify your email.' })
  } catch (err) {
    return res.status(400).json({ message: err instanceof Error ? err.message : 'Registration failed' })
  }
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }
  try {
    const { user, token } = await loginUser(email, password)
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isVerified: user.is_verified
      }
    })
  } catch (err) {
    return res.status(400).json({ message: err instanceof Error ? err.message : 'Login failed' })
  }
}

export const verifyEmailController = async (req: Request, res: Response) => {
  const { email, code } = req.body
  if (!email || !code) {
    return res.status(400).json({ message: 'Email and code are required' })
  }
  try {
    await verifyEmail(email, code)
    return res.json({ message: 'Email verified' })
  } catch (err) {
    return res.status(400).json({ message: err instanceof Error ? err.message : 'Verification failed' })
  }
}

export const resendVerificationController = async (req: Request, res: Response) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ message: 'Email is required' })
  }
  try {
    await resendVerification(email)
    return res.json({ message: 'If the email exists, a new code was sent.' })
  } catch (err) {
    return res.status(400).json({ message: err instanceof Error ? err.message : 'Failed to resend verification' })
  }
}

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ message: 'Email is required' })
  }
  try {
    await requestPasswordReset(email)
    return res.json({ message: 'If the email exists, a reset code was sent.' })
  } catch (err) {
    return res.status(400).json({ message: err instanceof Error ? err.message : 'Failed to request reset' })
  }
}

export const resetPasswordController = async (req: Request, res: Response) => {
  const { email, code, password } = req.body
  if (!email || !code || !password) {
    return res.status(400).json({ message: 'Email, code, and password are required' })
  }
  try {
    await resetPassword(email, code, password)
    return res.json({ message: 'Password updated' })
  } catch (err) {
    return res.status(400).json({ message: err instanceof Error ? err.message : 'Failed to reset password' })
  }
}

