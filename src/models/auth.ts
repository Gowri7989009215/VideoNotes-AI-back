import { query } from '../config/db'

export interface EmailVerification {
  id: string
  user_id: string
  verification_code: string
  expires_at: Date
}

export interface PasswordReset {
  id: string
  user_id: string
  reset_code: string
  expires_at: Date
}

export const createEmailVerification = async (userId: string, code: string, expiresAt: Date) => {
  await query('INSERT INTO email_verifications (user_id, verification_code, expires_at) VALUES ($1, $2, $3)', [
    userId,
    code,
    expiresAt
  ])
}

export const consumeEmailVerification = async (userId: string, code: string): Promise<boolean> => {
  const result = await query(
    'DELETE FROM email_verifications WHERE user_id = $1 AND verification_code = $2 AND expires_at > NOW() RETURNING *',
    [userId, code]
  )
  return (result as any).rowCount > 0
}

export const createPasswordReset = async (userId: string, code: string, expiresAt: Date) => {
  await query('INSERT INTO password_resets (user_id, reset_code, expires_at) VALUES ($1, $2, $3)', [
    userId,
    code,
    expiresAt
  ])
}

export const consumePasswordReset = async (userId: string, code: string): Promise<boolean> => {
  const result = await query(
    'DELETE FROM password_resets WHERE user_id = $1 AND reset_code = $2 AND expires_at > NOW() RETURNING *',
    [userId, code]
  )
  return (result as any).rowCount > 0
}

