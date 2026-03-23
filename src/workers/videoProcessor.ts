import path from 'path'
import fs from 'fs'
import https from 'https'
import ffmpeg from 'fluent-ffmpeg'
import type { Job } from 'bullmq'
import PDFDocument from 'pdfkit'
import { env } from '../config/env'
import { markJobCompleted, markJobFailed, markJobProcessing } from '../services/videoService'
import { sendJobCompletionEmail } from '../utils/email'
import { query } from '../config/db'
import OpenAI from 'openai'
import { extractVideoId, fetchYoutubeTranscript, type TranscriptSegment } from '../services/youtubeService'

interface VideoJobData {
  jobId: string
  videoPath: string
  youtubeUrl?: string
  mode: 'frames' | 'frames+transcript'
  intervalSeconds: number
  userId: string
}

const openai = new OpenAI({ apiKey: env.openAiApiKey || undefined })

const extractAudio = async (videoPath: string, audioPath: string) => {
  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .save(audioPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
  })
}

const transcribeAudio = async (audioPath: string): Promise<TranscriptSegment[]> => {
  if (!env.openAiApiKey) {
    return []
  }
  const file = fs.createReadStream(audioPath)
  const resp = await openai.audio.transcriptions.create({
    file,
    model: 'gpt-4o-mini-transcribe',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment']
  } as any)

  const segments: TranscriptSegment[] =
    (resp as any).segments?.map((s: any) => ({ start: s.start, end: s.end, text: s.text })) ?? []
  return segments
}

const extractFrames = async (videoPath: string, intervalSeconds: number, framesDir: string) => {
  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions(['-vf', `fps=1/${intervalSeconds}`])
      .output(path.join(framesDir, 'frame_%06d.png'))
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()
  })
}

const matchTranscriptToFrames = (framesDir: string, segments: TranscriptSegment[]) => {
  const files = fs
    .readdirSync(framesDir)
    .filter((f) => f.endsWith('.png'))
    .sort()
  return files.map((file, index) => {
    const frameTime = index // approximate at 1s per frame index; real mapping can use ffprobe in future
    const segment = segments.find((s) => s.start <= frameTime && frameTime <= s.end)
    return { filePath: path.join(framesDir, file), text: segment?.text ?? '' }
  })
}

const generatePdf = async (
  pages: { filePath: string; text: string }[],
  pdfPath: string,
  mode: 'frames' | 'frames+transcript'
) => {
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false })
    const stream = fs.createWriteStream(pdfPath)
    doc.pipe(stream)

    pages.forEach(({ filePath, text }) => {
      doc.addPage({ margin: 40 })
      const pageWidth = doc.page.width - 80
      const pageHeight = doc.page.height - 160

      if (fs.existsSync(filePath)) {
        doc.image(filePath, 40, 40, {
          fit: [pageWidth, pageHeight / 2],
          align: 'center'
        })
      }

      if (mode === 'frames+transcript' && text) {
        doc.moveDown()
        doc.fontSize(12).text('Transcript:', { underline: true })
        doc.moveDown(0.5)
        doc.fontSize(11).text(text, { align: 'left' })
      }
    })

    doc.end()
    stream.on('finish', () => resolve())
    stream.on('error', (err) => reject(err))
  })
}

export const videoProcessingJobHandler = async (job: Job<VideoJobData>) => {
  const data = job.data
  const { jobId, videoPath, youtubeUrl, mode, intervalSeconds, userId } = data
  try {
    await markJobProcessing(jobId)

    const storageRoot = env.storageRoot
    const framesDir = path.join(storageRoot, 'frames', jobId)
    const tempDir = path.join(storageRoot, 'temp', jobId)
    const pdfDir = path.join(storageRoot, 'pdfs')
    fs.mkdirSync(framesDir, { recursive: true })
    fs.mkdirSync(tempDir, { recursive: true })
    fs.mkdirSync(pdfDir, { recursive: true })

    let pages: { filePath: string; text: string }[] = []

    if (youtubeUrl) {
      // YouTube pipeline: use transcript + thumbnail, no full video download
      const videoId = extractVideoId(youtubeUrl) ?? 'unknown'
      const segments = await fetchYoutubeTranscript(videoId)

      const thumbnailPath = path.join(tempDir, 'thumb.jpg')
      await new Promise<void>((resolve, reject) => {
        const file = fs.createWriteStream(thumbnailPath)
        https
          .get(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, (res) => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Thumbnail download failed with status ${res.statusCode}`))
              return
            }
            res.pipe(file)
            file.on('finish', () => file.close(() => resolve()))
          })
          .on('error', (err: Error) => reject(err))
      })

      // Approximate pages based on total duration and interval
      const totalDuration =
        segments.length > 0 ? segments[segments.length - 1].end : intervalSeconds * 10
      const pageTimes: number[] = []
      for (let t = 0; t <= totalDuration; t += intervalSeconds) {
        pageTimes.push(t)
      }

      pages = pageTimes.map((t) => {
        const segment = segments.find((s) => s.start <= t && t <= s.end) ?? segments[0]
        const text = mode === 'frames+transcript' && segment ? segment.text : ''
        return { filePath: thumbnailPath, text: text ?? '' }
      })
    } else {
      // Local upload pipeline: FFmpeg + optional Whisper
      let segments: TranscriptSegment[] = []
      if (mode === 'frames+transcript') {
        const audioPath = path.join(tempDir, 'audio.wav')
        await extractAudio(videoPath, audioPath)
        segments = await transcribeAudio(audioPath)
      }

      await extractFrames(videoPath, intervalSeconds, framesDir)

      const frameFiles = fs
        .readdirSync(framesDir)
        .filter((f) => f.endsWith('.png'))
        .sort()
      pages =
        mode === 'frames'
          ? frameFiles.map((file) => ({
              filePath: path.join(framesDir, file),
              text: ''
            }))
          : matchTranscriptToFrames(framesDir, segments)
    }

    const pdfPath = path.join(pdfDir, `${jobId}.pdf`)
    await generatePdf(pages, pdfPath, mode)

    await markJobCompleted(jobId, pdfPath, pages.length)

    const userResult = await query('SELECT email FROM users WHERE id = $1', [userId])
    const email = (userResult.rows[0] as any)?.email as string | undefined
    if (email) {
      await sendJobCompletionEmail(email, jobId)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Video processing job failed', err)
    await markJobFailed(jobId)
    throw err
  }
}

