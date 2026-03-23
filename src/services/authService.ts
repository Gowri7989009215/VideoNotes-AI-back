import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { createUser, findUserByEmail, markUserVerified } from '../models/user'
import {
  consumeEmailVerification,
  consumePasswordReset,
  createEmailVerification,
  createPasswordReset
} from '../models/auth'
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/email'

const EMAIL_CODE_TTL_MINUTES = 15

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString()

export const registerUser = async (name: string, email: string, password: string) => {
  const existing = await findUserByEmail(email)
  if (existing) {
    throw new Error('Email already registered')
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await createUser(name, email, passwordHash)

  const code = generateCode()
  const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000)
  await createEmailVerification(user.id, code, expiresAt)
  await sendVerificationEmail(user.email, code)

  return user
}

export const loginUser = async (email: string, password: string) => {
  const user = await findUserByEmail(email)
  if (!user) {
    throw new Error('Invalid email or password')
  }
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    throw new Error('Invalid email or password')
  }
  if (!user.is_verified) {
    throw new Error('Please verify your email before logging in')
  }
  const token = jwt.sign({ userId: user.id, email: user.email }, env.jwtSecret, { expiresIn: '7d' })
  return { user, token }
}

export const verifyEmail = async (email: string, code: string) => {
  const user = await findUserByEmail(email)
  if (!user) throw new Error('User not found')
  const ok = await consumeEmailVerification(user.id, code)
  if (!ok) throw new Error('Invalid or expired verification code')
  await markUserVerified(user.id)
}

export const resendVerification = async (email: string) => {
  const user = await findUserByEmail(email)
  if (!user) {
    return
  }
  const code = generateCode()
  const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000)
  await createEmailVerification(user.id, code, expiresAt)
  await sendVerificationEmail(user.email, code)
}

export const requestPasswordReset = async (email: string) => {
  const user = await findUserByEmail(email)
  if (!user) {
    return
  }
  const code = generateCode()
  const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000)
  await createPasswordReset(user.id, code, expiresAt)
  await sendPasswordResetEmail(user.email, code)
}

export const resetPassword = async (email: string, code: string, newPassword: string) => {
  const user = await findUserByEmail(email)
  if (!user) throw new Error('User not found')
  const ok = await consumePasswordReset(user.id, code)
  if (!ok) throw new Error('Invalid or expired reset code')
  const hash = await bcrypt.hash(newPassword, 10)
  await import('../config/db').then(({ query }) =>
    query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id])
  )
}

