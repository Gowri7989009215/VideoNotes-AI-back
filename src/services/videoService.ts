import path from 'path'
import fs from 'fs'
import { env } from '../config/env'
import { createJob, createOutput, createVideo, findJobByIdForUser, findJobsForUser, updateJobStatus } from '../models/video'
import { videoQueue } from '../config/queue'
import { extractVideoId } from './youtubeService'

export const ensureStorage = () => {
  const root = env.storageRoot
  const dirs = [root, path.join(root, 'uploads'), path.join(root, 'temp'), path.join(root, 'pdfs'), path.join(root, 'frames')]
  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true })
    }
  }
}

export const createVideoJobFromUpload = async (
  userId: string,
  filePath: string,
  mode: 'frames' | 'frames+transcript',
  intervalSeconds: number
) => {
  ensureStorage()
  const video = await createVideo(userId, 'upload', null, filePath)
  const job = await createJob(userId, video.id, mode, intervalSeconds)
  await videoQueue.add('process', {
    jobId: job.id,
    videoPath: filePath,
    mode,
    intervalSeconds,
    userId
  })
  return job
}

export const createVideoJobFromYoutube = async (
  userId: string,
  youtubeUrl: string,
  mode: 'frames' | 'frames+transcript',
  intervalSeconds: number
) => {
  ensureStorage()
  const videoId = extractVideoId(youtubeUrl) ?? 'unknown'
  const placeholderPath = `youtube:${videoId}`
  const video = await createVideo(userId, 'youtube', youtubeUrl, placeholderPath)
  const job = await createJob(userId, video.id, mode, intervalSeconds)
  await videoQueue.add('process', {
    jobId: job.id,
    videoPath: placeholderPath,
    youtubeUrl,
    mode,
    intervalSeconds,
    userId
  })
  return job
}

export const listJobsForUser = async (userId: string, limit?: number) => {
  const jobs = await findJobsForUser(userId, limit)
  return jobs.map((j) => ({
    id: j.id,
    mode: j.mode,
    intervalSeconds: j.interval_seconds,
    status: j.status,
    createdAt: j.created_at,
    videoId: j.video_id,
    output: j.output
      ? {
          id: j.output.id,
          pdfUrl: `/api/files/${encodeURIComponent(j.output.pdf_path)}`,
          frameCount: j.output.frame_count,
          createdAt: j.output.created_at
        }
      : null
  }))
}

export const getJobForUser = async (userId: string, jobId: string) => {
  const job = await findJobByIdForUser(userId, jobId)
  if (!job) return null
  return {
    id: job.id,
    mode: job.mode,
    intervalSeconds: job.interval_seconds,
    status: job.status,
    createdAt: job.created_at,
    videoId: job.video_id,
    output: job.output
      ? {
          id: job.output.id,
          pdfUrl: `/api/files/${encodeURIComponent(job.output.pdf_path)}`,
          frameCount: job.output.frame_count,
          createdAt: job.output.created_at
        }
      : null
  }
}

export const markJobProcessing = (jobId: string) => updateJobStatus(jobId, 'processing')
export const markJobFailed = (jobId: string) => updateJobStatus(jobId, 'failed')
export const markJobCompleted = async (jobId: string, pdfPath: string, frameCount: number) => {
  await updateJobStatus(jobId, 'completed')
  await createOutput(jobId, pdfPath, frameCount)
}

