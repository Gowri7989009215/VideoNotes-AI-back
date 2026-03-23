import { Router } from 'express'
import {
  forgotPassword,
  login,
  register,
  resendVerificationController,
  resetPasswordController,
  verifyEmailController
} from '../controllers/authController'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/verify-email', verifyEmailController)
router.post('/resend-verification', resendVerificationController)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPasswordController)

export default router

