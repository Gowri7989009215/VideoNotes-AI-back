import { Router } from 'express'
import { authMiddleware } from '../middlewares/auth'
import { getJob, listJobs } from '../controllers/videoController'

// Convenience routes to match frontend: /api/jobs/*
const router = Router()

router.get('/', authMiddleware, listJobs)
router.get('/:jobId', authMiddleware, getJob)

export default router

