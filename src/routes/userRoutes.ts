import { Router } from 'express'
import { getMe } from '../controllers/userController'
import { authMiddleware } from '../middlewares/auth'

const router = Router()

router.get('/me', authMiddleware, getMe)

export default router

