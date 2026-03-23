import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { uploadVideo, createYoutubeJob, listJobs, getJob } from '../controllers/videoController'
import { authMiddleware } from '../middlewares/auth'
import { env } from '../config/env'

const storageRoot = env.storageRoot
const uploadDir = path.join(storageRoot, 'uploads')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const unique = Date.now().toString(36)
    cb(null, `${unique}-${file.originalname}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB; adjust for production
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true)
    else cb(new Error('Only video files are allowed'))
  }
})

const router = Router()

router.post('/upload', authMiddleware, upload.single('file'), uploadVideo)
router.post('/youtube', authMiddleware, createYoutubeJob)
router.get('/jobs', authMiddleware, listJobs)
router.get('/jobs/:jobId', authMiddleware, getJob)

export default router

