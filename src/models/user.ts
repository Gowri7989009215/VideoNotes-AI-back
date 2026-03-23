import { query } from '../config/db'

export interface User {
  id: string
  name: string
  email: string
  password_hash: string
  is_verified: boolean
  created_at: Date
}

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
  return result.rows[0] ?? null
}

export const findUserById = async (id: string): Promise<User | null> => {
  const result = await query('SELECT * FROM users WHERE id = $1', [id])
  return result.rows[0] ?? null
}

export const createUser = async (name: string, email: string, passwordHash: string): Promise<User> => {
  const result = await query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
    [name, email.toLowerCase(), passwordHash]
  )
  return result.rows[0]
}

export const markUserVerified = async (userId: string): Promise<void> => {
  await query('UPDATE users SET is_verified = true WHERE id = $1', [userId])
}

