"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoProcessingJobHandler = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const https_1 = __importDefault(require("https"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const env_1 = require("../config/env");
const videoService_1 = require("../services/videoService");
const email_1 = require("../utils/email");
const db_1 = require("../config/db");
const openai_1 = __importDefault(require("openai"));
const youtubeService_1 = require("../services/youtubeService");
const openai = new openai_1.default({ apiKey: env_1.env.openAiApiKey || undefined });
const extractAudio = async (videoPath, audioPath) => {
    await new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(videoPath)
            .noVideo()
            .audioCodec('pcm_s16le')
            .save(audioPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err));
    });
};
const transcribeAudio = async (audioPath) => {
    if (!env_1.env.openAiApiKey) {
        return [];
    }
    const file = fs_1.default.createReadStream(audioPath);
    const resp = await openai.audio.transcriptions.create({
        file,
        model: 'gpt-4o-mini-transcribe',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment']
    });
    const segments = resp.segments?.map((s) => ({ start: s.start, end: s.end, text: s.text })) ?? [];
    return segments;
};
const extractFrames = async (videoPath, intervalSeconds, framesDir) => {
    await new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(videoPath)
            .outputOptions(['-vf', `fps=1/${intervalSeconds}`])
            .output(path_1.default.join(framesDir, 'frame_%06d.png'))
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
};
const matchTranscriptToFrames = (framesDir, segments) => {
    const files = fs_1.default
        .readdirSync(framesDir)
        .filter((f) => f.endsWith('.png'))
        .sort();
    return files.map((file, index) => {
        const frameTime = index; // approximate at 1s per frame index; real mapping can use ffprobe in future
        const segment = segments.find((s) => s.start <= frameTime && frameTime <= s.end);
        return { filePath: path_1.default.join(framesDir, file), text: segment?.text ?? '' };
    });
};
const generatePdf = async (pages, pdfPath, mode) => {
    await new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ autoFirstPage: false });
        const stream = fs_1.default.createWriteStream(pdfPath);
        doc.pipe(stream);
        pages.forEach(({ filePath, text }) => {
            doc.addPage({ margin: 40 });
            const pageWidth = doc.page.width - 80;
            const pageHeight = doc.page.height - 160;
            if (fs_1.default.existsSync(filePath)) {
                doc.image(filePath, 40, 40, {
                    fit: [pageWidth, pageHeight / 2],
                    align: 'center'
                });
            }
            if (mode === 'frames+transcript' && text) {
                doc.moveDown();
                doc.fontSize(12).text('Transcript:', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(11).text(text, { align: 'left' });
            }
        });
        doc.end();
        stream.on('finish', () => resolve());
        stream.on('error', (err) => reject(err));
    });
};
const videoProcessingJobHandler = async (job) => {
    const data = job.data;
    const { jobId, videoPath, youtubeUrl, mode, intervalSeconds, userId } = data;
    try {
        await (0, videoService_1.markJobProcessing)(jobId);
        const storageRoot = env_1.env.storageRoot;
        const framesDir = path_1.default.join(storageRoot, 'frames', jobId);
        const tempDir = path_1.default.join(storageRoot, 'temp', jobId);
        const pdfDir = path_1.default.join(storageRoot, 'pdfs');
        fs_1.default.mkdirSync(framesDir, { recursive: true });
        fs_1.default.mkdirSync(tempDir, { recursive: true });
        fs_1.default.mkdirSync(pdfDir, { recursive: true });
        let pages = [];
        if (youtubeUrl) {
            // YouTube pipeline: use transcript + thumbnail, no full video download
            const videoId = (0, youtubeService_1.extractVideoId)(youtubeUrl) ?? 'unknown';
            const segments = await (0, youtubeService_1.fetchYoutubeTranscript)(videoId);
            const thumbnailPath = path_1.default.join(tempDir, 'thumb.jpg');
            await new Promise((resolve, reject) => {
                const file = fs_1.default.createWriteStream(thumbnailPath);
                https_1.default
                    .get(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, (res) => {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`Thumbnail download failed with status ${res.statusCode}`));
                        return;
                    }
                    res.pipe(file);
                    file.on('finish', () => file.close(() => resolve()));
                })
                    .on('error', (err) => reject(err));
            });
            // Approximate pages based on total duration and interval
            const totalDuration = segments.length > 0 ? segments[segments.length - 1].end : intervalSeconds * 10;
            const pageTimes = [];
            for (let t = 0; t <= totalDuration; t += intervalSeconds) {
                pageTimes.push(t);
            }
            pages = pageTimes.map((t) => {
                const segment = segments.find((s) => s.start <= t && t <= s.end) ?? segments[0];
                const text = mode === 'frames+transcript' && segment ? segment.text : '';
                return { filePath: thumbnailPath, text: text ?? '' };
            });
        }
        else {
            // Local upload pipeline: FFmpeg + optional Whisper
            let segments = [];
            if (mode === 'frames+transcript') {
                const audioPath = path_1.default.join(tempDir, 'audio.wav');
                await extractAudio(videoPath, audioPath);
                segments = await transcribeAudio(audioPath);
            }
            await extractFrames(videoPath, intervalSeconds, framesDir);
            const frameFiles = fs_1.default
                .readdirSync(framesDir)
                .filter((f) => f.endsWith('.png'))
                .sort();
            pages =
                mode === 'frames'
                    ? frameFiles.map((file) => ({
                        filePath: path_1.default.join(framesDir, file),
                        text: ''
                    }))
                    : matchTranscriptToFrames(framesDir, segments);
        }
        const pdfPath = path_1.default.join(pdfDir, `${jobId}.pdf`);
        await generatePdf(pages, pdfPath, mode);
        await (0, videoService_1.markJobCompleted)(jobId, pdfPath, pages.length);
        const userResult = await (0, db_1.query)('SELECT email FROM users WHERE id = $1', [userId]);
        const email = userResult.rows[0]?.email;
        if (email) {
            await (0, email_1.sendJobCompletionEmail)(email, jobId);
        }
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error('Video processing job failed', err);
        await (0, videoService_1.markJobFailed)(jobId);
        throw err;
    }
};
exports.videoProcessingJobHandler = videoProcessingJobHandler;
