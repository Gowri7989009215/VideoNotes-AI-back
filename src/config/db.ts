import { Pool } from 'pg'
import { env } from './env'

export const pool = new Pool({
  connectionString: env.databaseUrl
})

// Lightweight typed wrapper; callers can cast result.rows as needed.
export const query = (text: string, params?: any[]) => pool.query(text, params)

