import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import path from 'path'
import fs from 'fs'
import { env } from './config/env'
import authRoutes from './routes/authRoutes'
import userRoutes from './routes/userRoutes'
import videoRoutes from './routes/videoRoutes'
import jobRoutes from './routes/jobRoutes'
import { startVideoWorker } from './config/queue'

const app = express()

app.use(
  cors({
    origin: ['http://localhost:5173'],
    credentials: false
  })
)

app.use(express.json())
app.use(cookieParser())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
})
app.use(limiter)

const storageRoot = env.storageRoot
if (!fs.existsSync(storageRoot)) {
  fs.mkdirSync(storageRoot, { recursive: true })
}

app.use('/api/files', (req, res) => {
  const encoded = req.path.slice(1)
  const filePath = decodeURIComponent(encoded)
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
  if (!fs.existsSync(absolute)) {
    return res.status(404).send('File not found')
  }
  return res.sendFile(absolute)
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/videos', videoRoutes)
app.use('/api/jobs', jobRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const port = env.port

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`)
})

try {
  startVideoWorker()
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('Worker failed to start (Redis/queue). API will still run.', err)
}

