# VideoNotes AI

VideoNotes AI is a full-stack web application that turns long-form videos (file uploads or YouTube links) into concise **visual notes**: a PDF containing extracted frames and, optionally, aligned speech transcripts.

The stack is:

- **Frontend**: React (Vite), TypeScript, Tailwind CSS, React Router, Axios
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL
- **Queue / Worker**: BullMQ + Redis
- **Video processing**: FFmpeg + fluent-ffmpeg
- **Transcription**: OpenAI Whisper (via OpenAI API)
- **PDF generation**: PDFKit
- **Email**: Nodemailer (Gmail SMTP)

## Architecture Overview

High-level flow:

1. User registers, verifies email, and logs in.
2. User uploads a video or pastes a YouTube URL, chooses:
   - Mode: **frames only** or **frames + transcript**
   - Interval: 1s / 3s / 5s
3. Backend creates a `Video` record and a `Job`, then enqueues a BullMQ job.
4. Worker:
   - (If YouTube) downloads the video using `ytdl-core`
   - Extracts audio with FFmpeg
   - Runs Whisper transcription (if transcript mode)
   - Extracts frames at the chosen interval
   - Matches frames to transcript segments by timestamp
   - Builds a PDF via PDFKit (frame image + optional transcript under each)
   - Stores the PDF path in `Outputs` and marks the `Job` completed
   - Sends a completion email
5. Frontend polls job status and exposes a download link for the generated PDF.

## Backend API Summary

Base URL (local): `http://localhost:4000/api`

- **Auth**
  - `POST /auth/register` – `{ name, email, password }`
  - `POST /auth/login` – `{ email, password }` → `{ token, user }`
  - `POST /auth/verify-email` – `{ email, code }`
  - `POST /auth/resend-verification` – `{ email }`
  - `POST /auth/forgot-password` – `{ email }`
  - `POST /auth/reset-password` – `{ email, code, password }`
- **User**
  - `GET /users/me` – current user profile (requires `Authorization: Bearer <token>`)
- **Videos / Jobs**
  - `POST /videos/upload` – multipart form with `file`, `mode`, `intervalSeconds`
  - `POST /videos/youtube` – `{ youtubeUrl, mode, intervalSeconds }`
  - `GET /videos/jobs` – list current user jobs (optional `?limit=`)
  - `GET /videos/jobs/:jobId` – full job details + output
  - `GET /files/<encoded-file-path>` – internal file serving for generated PDFs

## Database Schema

Defined in `database/schema.sql`:

- `users` – accounts with hashed passwords and verification flag
- `email_verifications` – verification codes with expiration
- `password_resets` – reset codes with expiration
- `videos` – uploaded or YouTube-sourced videos
- `jobs` – processing jobs (mode, interval, status)
- `outputs` – generated PDF metadata (path + frame_count)

Run this schema automatically via Docker (see below) or manually:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

## Local Environment Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- FFmpeg installed and available on `PATH`
- A Gmail account for SMTP (or app password)
- OpenAI API key with Whisper access

### Environment Variables

Create a `.env` file at the project root (`c:\pro2`):

```bash
PORT=4000
DATABASE_URL=postgres://videonotes:videonotes@localhost:5432/videonotes
JWT_SECRET=super-secret-jwt-key
GMAIL_USER=your-gmail@gmail.com
GMAIL_PASS=your-gmail-app-password
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
STORAGE_ROOT=storage
```

The backend reads these via `src/config/env.ts`.

### Database Migration

With PostgreSQL running and `DATABASE_URL` set:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

This creates all tables and indexes required by the backend.

## Running the Backend

From `c:\pro2\backend`:

```bash
npm install
npm run build   # type-check + compile
npm run dev     # or: npm start after build
```

The backend:

- Exposes `http://localhost:4000/api`
- Starts a BullMQ worker for video jobs
- Serves generated PDFs via `/api/files/<encoded-path>`

Make sure FFmpeg and Redis are running and reachable.

## Running the Frontend

From `c:\pro2\frontend`:

```bash
npm install
npm run dev
```

The Vite dev server runs at `http://localhost:5173`. It uses:

```bash
VITE_API_BASE_URL=http://localhost:4000/api
```

Set this in `frontend/.env` (optional) if you need to override.

## Installing FFmpeg

On Windows:

1. Download FFmpeg static build from the official site.
2. Extract to a folder like `C:\ffmpeg`.
3. Add `C:\ffmpeg\bin` to the `PATH` environment variable.

Verify:

```bash
ffmpeg -version
```

## Installing Redis

For development, use Docker:

```bash
docker run --name redis -p 6379:6379 -d redis:7
```

Or install a native Redis build and ensure it listens on `localhost:6379`.

## Docker / Docker Compose

The `database/docker-compose.yml` file defines a full stack:

- PostgreSQL with schema auto-applied
- Redis
- Backend (serving API on `4000`)
- Frontend (served by Nginx on `5173`)

From `c:\pro2\database`:

```bash
docker compose up --build
```

Then open `http://localhost:5173` in your browser.

## Deployment Guide

### Backend

1. Build production bundle:

   ```bash
   cd backend
   npm install
   npm run build
   ```

2. Use the provided `backend/Dockerfile` or deploy compiled `dist` to your Node hosting:
   - Ensure environment variables are configured
   - Ensure PostgreSQL, Redis, FFmpeg, and OpenAI API are available in the environment

### Frontend

1. Build static assets:

   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. Serve `dist` via Nginx/Apache or use the provided `frontend/Dockerfile` for containerized hosting.

### Database & Redis

- For production, provision managed PostgreSQL and Redis where possible.
- Apply `database/schema.sql` (or a migration system of your choice).

## Future Improvements

- S3 storage support for frames and PDFs instead of local disk.
- Multi-tenant support and team workspaces.
- More advanced transcript alignment using FFprobe timestamps.
- Per-user rate limiting and job quotas.
- WebSocket-based real-time job status updates.
- In-app PDF preview and annotation tools.

