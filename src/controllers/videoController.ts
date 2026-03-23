import type { Response } from 'express'
import type { AuthRequest } from '../middlewares/auth'
import { createVideoJobFromUpload, createVideoJobFromYoutube, getJobForUser, listJobsForUser } from '../services/videoService'

export const uploadVideo = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' })
  const file = (req as any).file as Express.Multer.File | undefined
  const { mode, intervalSeconds } = req.body
  if (!file) {
    return res.status(400).json({ message: 'File is required' })
  }
  const interval = Number(intervalSeconds ?? 3)
  if (!['frames', 'frames+transcript'].includes(mode)) {
    return res.status(400).json({ message: 'Invalid mode' })
  }
  try {
    const job = await createVideoJobFromUpload(req.user.id, file.path, mode, interval)
    return res.status(201).json({ jobId: job.id })
  } catch (err) {
    return res.status(500).json({ message: err instanceof Error ? err.message : 'Failed to create job' })
  }
}

export const createYoutubeJob = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' })
  const { youtubeUrl, mode, intervalSeconds } = req.body
  const interval = Number(intervalSeconds ?? 3)
  if (!youtubeUrl) return res.status(400).json({ message: 'YouTube URL is required' })
  if (!['frames', 'frames+transcript'].includes(mode)) {
    return res.status(400).json({ message: 'Invalid mode' })
  }
  try {
    const job = await createVideoJobFromYoutube(req.user.id, youtubeUrl, mode, interval)
    return res.status(201).json({ jobId: job.id })
  } catch (err) {
    return res.status(500).json({ message: err instanceof Error ? err.message : 'Failed to create job' })
  }
}

export const listJobs = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' })
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const jobs = await listJobsForUser(req.user.id, limit)
  return res.json({ jobs })
}

export const getJob = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' })
  const jobId = req.params.jobId as string
  const job = await getJobForUser(req.user.id, jobId)
  if (!job) return res.status(404).json({ message: 'Job not found' })
  return res.json(job)
}

