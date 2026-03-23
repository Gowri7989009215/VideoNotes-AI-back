import { query } from '../config/db'

export interface Video {
  id: string
  user_id: string
  input_type: 'upload' | 'youtube'
  source_url: string | null
  file_path: string
  created_at: Date
}

export interface Job {
  id: string
  user_id: string
  video_id: string
  mode: 'frames' | 'frames+transcript'
  interval_seconds: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: Date
}

export interface Output {
  id: string
  job_id: string
  pdf_path: string
  frame_count: number
  created_at: Date
}

export const createVideo = async (
  userId: string,
  inputType: 'upload' | 'youtube',
  sourceUrl: string | null,
  filePath: string
): Promise<Video> => {
  const result = await query(
    'INSERT INTO videos (user_id, input_type, source_url, file_path) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, inputType, sourceUrl, filePath]
  )
  return result.rows[0]
}

export const createJob = async (
  userId: string,
  videoId: string,
  mode: Job['mode'],
  intervalSeconds: number
): Promise<Job> => {
  const result = await query(
    'INSERT INTO jobs (user_id, video_id, mode, interval_seconds, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId, videoId, mode, intervalSeconds, 'pending']
  )
  return result.rows[0]
}

export const updateJobStatus = async (jobId: string, status: Job['status']) => {
  await query('UPDATE jobs SET status = $1 WHERE id = $2', [status, jobId])
}

export const createOutput = async (jobId: string, pdfPath: string, frameCount: number): Promise<Output> => {
  const result = await query(
    'INSERT INTO outputs (job_id, pdf_path, frame_count) VALUES ($1, $2, $3) RETURNING *',
    [jobId, pdfPath, frameCount]
  )
  return result.rows[0]
}

export const findJobsForUser = async (userId: string, limit?: number): Promise<(Job & { output: Output | null })[]> => {
  const safeLimit = limit && Number.isFinite(Number(limit)) ? Number(limit) : undefined
  const limitClause = safeLimit ? `LIMIT ${safeLimit}` : ''
  const result = await query(
    `
      SELECT DISTINCT j.*, o.id as "output_id", o.pdf_path, o.frame_count, o.created_at as "output_created_at"
      FROM jobs j
      LEFT JOIN outputs o ON o.job_id = j.id
      WHERE j.user_id = $1
      ORDER BY j.created_at DESC
      ${limitClause}
    `,
    [userId]
  )
  return result.rows.map((row) => {
    const output: Output | null = row.output_id
      ? {
          id: row.output_id,
          job_id: row.id,
          pdf_path: row.pdf_path ?? '',
          frame_count: row.frame_count ?? 0,
          created_at: row.output_created_at ?? new Date()
        }
      : null
    const { output_id, pdf_path, frame_count, output_created_at, ...job } = row
    return { ...(job as Job), output }
  })
}

export const findJobByIdForUser = async (
  userId: string,
  jobId: string
): Promise<(Job & { output: Output | null }) | null> => {
  const result = await query(
    `
      SELECT j.*, o.id as "output_id", o.pdf_path, o.frame_count, o.created_at as "output_created_at"
      FROM jobs j
      LEFT JOIN outputs o ON o.job_id = j.id
      WHERE j.user_id = $1 AND j.id = $2
    `,
    [userId, jobId]
  )
  const row = result.rows[0]
  if (!row) return null
  const output: Output | null = row.output_id
    ? {
        id: row.output_id,
        job_id: row.id,
        pdf_path: row.pdf_path ?? '',
        frame_count: row.frame_count ?? 0,
        created_at: row.output_created_at ?? new Date()
      }
    : null
  const { output_id, pdf_path, frame_count, output_created_at, ...job } = row
  return { ...(job as Job), output }
}

