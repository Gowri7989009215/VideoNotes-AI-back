# AI Video Notes - Complete Project Guide

## Overview

AI Video Notes is a web application that extracts frames from videos (local uploads or YouTube links) and optionally generates transcripts using speech recognition. The output is a PDF containing video frames with synchronized transcript text.

## Architecture

### Tech Stack

**Backend (Node.js + TypeScript)**
- **Express.js** - REST API server
- **BullMQ** - Job queue for background video processing
- **PostgreSQL** - Database for jobs, users, and metadata
- **Redis** - Queue backend and caching
- **FFmpeg** - Video/audio processing
- **Vosk** - Offline speech recognition
- **PDFKit** - PDF generation
- **youtube-dl-exec** - YouTube video downloading

**Frontend (React + TypeScript)**
- **React Router** - Navigation
- **Axios** - API client
- **TailwindCSS** - Styling
- **TypeScript** - Type safety

## How It Works

### 1. User Upload/YouTube Link

1. User selects **Upload Video** or **YouTube URL**
2. Chooses processing mode:
   - `frames` - Extract frames only
   - `frames+transcript` - Extract frames + generate transcript
3. Sets frame extraction interval (default: 3 seconds)
4. Submits form → Creates job in queue

### 2. Background Processing (BullMQ Worker)

The `videoProcessor.ts` worker handles two pipelines:

#### YouTube Pipeline
1. **Extract video ID** from YouTube URL
2. **Fetch YouTube transcript** (using youtube-transcript library)
3. **Download full video** using youtube-dl-exec
4. **Extract frames** at specified intervals
5. **Match transcript to frames** (distribute evenly)
6. **Generate PDF** with frames + transcript

#### Local Upload Pipeline
1. **Save uploaded video** to temp directory
2. **Extract audio** from video (MP3 format)
3. **Transcribe audio** using Vosk (offline)
4. **Extract frames** at specified intervals
5. **Distribute transcript words** evenly across frames
6. **Generate PDF** with frames + transcript

### 3. PDF Generation

Each PDF page contains:
- Frame number and timestamp
- Video frame image
- Transcript text (if available)

### 4. Database Schema

```sql
-- Users table
users (id, email, password_hash, created_at)

-- Videos table  
videos (id, user_id, filename, youtube_url, created_at)

-- Jobs table (processing queue)
jobs (id, user_id, video_id, mode, interval_seconds, status, error_message, created_at)

-- Outputs table (generated PDFs)
outputs (id, job_id, pdf_path, page_count, created_at)
```

## Key Components

### Backend Services

#### `/src/services/videoService.ts`
- Creates video and job records
- Manages job status updates
- Handles job queue operations

#### `/src/services/youtubeDownloadService.ts`
- Downloads YouTube videos
- Validates file sizes
- Handles download errors

#### `/src/services/youtubeService.ts`
- Extracts YouTube video IDs
- Fetches YouTube transcripts

#### `/src/workers/videoProcessor.ts`
- Main job processor
- Handles both YouTube and upload pipelines
- Audio extraction and transcription
- Frame extraction
- PDF generation

### Frontend Components

#### `/src/pages/dashboard/UploadPage.tsx`
- Video upload form
- YouTube URL input
- Processing mode selection
- Job submission

#### `/src/pages/dashboard/JobStatusPage.tsx`
- Real-time job status updates
- Progress tracking
- PDF download link
- Error display

#### `/src/pages/dashboard/DashboardPage.tsx`
- List of user jobs
- Job status badges
- Navigation to job details

## Configuration

### Environment Variables

```bash
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/videonotes
REDIS_URL=redis://localhost:6379
STORAGE_ROOT=./storage
OPENAI_API_KEY=sk-... (optional, not used with Vosk)
GEMINI_API_KEY=... (optional, not used with Vosk)

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:4000/api
```

### Storage Structure

```
storage/
├── frames/          # Extracted frames per job
│   └── {job_id}/
├── temp/             # Temporary files per job
│   └── {job_id}/
├── pdfs/             # Generated PDFs
│   └── {job_id}.pdf
└── models/           # Vosk speech model
    └── vosk-model-small-en-us-0.15/
```

## Installation & Setup

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- FFmpeg (system-wide)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Database Setup

```bash
psql -U postgres -c "CREATE DATABASE videonotes;"
psql -U postgres -d videonotes -f database/schema.sql
```

### Vosk Model Setup (One-time)

```bash
# Download and extract Vosk model
cd backend/storage
mkdir -p models
cd models
# Download from: https://alphacephei.com/vosk/models
# Extract vosk-model-small-en-us-0.15.zip here
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Video Processing
- `POST /api/videos/upload` - Upload video file
- `POST /api/videos/youtube` - Process YouTube URL
- `GET /api/jobs` - List user jobs
- `GET /api/jobs/:jobId` - Get job details
- `GET /api/jobs/:jobId/download` - Download PDF

## Processing Modes

### Frames Only
- Extracts frames at specified intervals
- No transcription
- Faster processing

### Frames + Transcript
- Extracts frames + generates transcript
- Uses Vosk for offline transcription
- Distributes transcript evenly across frames
- Slower processing but more comprehensive

## Transcription Details

### Vosk Offline Transcription
- **Model**: Small English model (40MB)
- **Format**: WAV (16kHz, mono)
- **Segmentation**: 3-second chunks
- **Distribution**: Word-based across frames

### Transcript Matching
- Combines all transcript text
- Splits by words
- Distributes evenly across all frames
- Ensures simultaneous completion

## Error Handling

### Common Errors
1. **YouTube download too small** - Video might be private/region-restricted
2. **Vosk model not found** - Model needs to be downloaded
3. **FFmpeg not found** - Install FFmpeg system-wide
4. **Database connection** - Check PostgreSQL/Redis status

### Error Storage
- Errors stored in `jobs.error_message`
- Displayed in frontend JobStatusPage
- Logged to console for debugging

## Performance Considerations

### Job Queue
- BullMQ handles concurrent processing
- Redis prevents duplicate processing
- Lock duration: 5 minutes

### File Management
- Temporary files cleaned up after processing
- PDFs stored permanently
- Frame extraction uses FFmpeg for efficiency

### Transcription
- Vosk runs locally (no API costs)
- Processing time depends on video length
- Word distribution ensures even PDF layout

## Security

### Authentication
- JWT tokens for session management
- Password hashing with bcrypt
- Protected routes require authentication

### File Security
- File type validation (video only)
- Size limits for uploads
- Sanitized filenames

### Rate Limiting
- 120 requests/minute per IP
- Job quotas per user (configurable)

## Future Enhancements

### Features
- S3 storage support
- Multi-language transcription
- Advanced transcript alignment
- Video preview thumbnails
- Batch processing

### Performance
- Worker scaling
- Cached transcripts
- Optimized frame extraction
- Progressive PDF generation

### UX Improvements
- Real-time progress bars
- Video trimming
- Custom frame intervals
- Transcript editing

## Troubleshooting

### Common Issues

**Q: YouTube download fails with small file size**
A: Video might be private or geo-restricted. Try a different video.

**Q: Transcription not working**
A: Ensure Vosk model is downloaded to `storage/models/`

**Q: Jobs stuck in "processing"**
A: Check Redis connection and worker logs.

**Q: PDF generation fails**
A: Verify frame extraction completed successfully.

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run dev
```

Check logs for:
- `[Transcribe]` - Transcription progress
- `[Download]` - YouTube download status
- `[matchTranscriptToFrames]` - Transcript distribution

## Production Deployment

### Docker
- Use provided Dockerfiles
- Mount persistent storage
- Configure environment variables

### Scaling
- Multiple worker instances
- Redis cluster for queue
- Load balancer for API

### Monitoring
- Job queue metrics
- Database performance
- File storage usage

---

This guide covers the complete architecture and operation of the AI Video Notes project. For specific implementation details, refer to the source code in each component.
