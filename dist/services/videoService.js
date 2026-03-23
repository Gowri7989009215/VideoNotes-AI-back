"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markJobCompleted = exports.markJobFailed = exports.markJobProcessing = exports.getJobForUser = exports.listJobsForUser = exports.createVideoJobFromYoutube = exports.createVideoJobFromUpload = exports.ensureStorage = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("../config/env");
const video_1 = require("../models/video");
const queue_1 = require("../config/queue");
const youtubeService_1 = require("./youtubeService");
const ensureStorage = () => {
    const root = env_1.env.storageRoot;
    const dirs = [root, path_1.default.join(root, 'uploads'), path_1.default.join(root, 'temp'), path_1.default.join(root, 'pdfs'), path_1.default.join(root, 'frames')];
    for (const d of dirs) {
        if (!fs_1.default.existsSync(d)) {
            fs_1.default.mkdirSync(d, { recursive: true });
        }
    }
};
exports.ensureStorage = ensureStorage;
const createVideoJobFromUpload = async (userId, filePath, mode, intervalSeconds) => {
    (0, exports.ensureStorage)();
    const video = await (0, video_1.createVideo)(userId, 'upload', null, filePath);
    const job = await (0, video_1.createJob)(userId, video.id, mode, intervalSeconds);
    await queue_1.videoQueue.add('process', {
        jobId: job.id,
        videoPath: filePath,
        mode,
        intervalSeconds,
        userId
    });
    return job;
};
exports.createVideoJobFromUpload = createVideoJobFromUpload;
const createVideoJobFromYoutube = async (userId, youtubeUrl, mode, intervalSeconds) => {
    (0, exports.ensureStorage)();
    const videoId = (0, youtubeService_1.extractVideoId)(youtubeUrl) ?? 'unknown';
    const placeholderPath = `youtube:${videoId}`;
    const video = await (0, video_1.createVideo)(userId, 'youtube', youtubeUrl, placeholderPath);
    const job = await (0, video_1.createJob)(userId, video.id, mode, intervalSeconds);
    await queue_1.videoQueue.add('process', {
        jobId: job.id,
        videoPath: placeholderPath,
        youtubeUrl,
        mode,
        intervalSeconds,
        userId
    });
    return job;
};
exports.createVideoJobFromYoutube = createVideoJobFromYoutube;
const listJobsForUser = async (userId, limit) => {
    const jobs = await (0, video_1.findJobsForUser)(userId, limit);
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
    }));
};
exports.listJobsForUser = listJobsForUser;
const getJobForUser = async (userId, jobId) => {
    const job = await (0, video_1.findJobByIdForUser)(userId, jobId);
    if (!job)
        return null;
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
    };
};
exports.getJobForUser = getJobForUser;
const markJobProcessing = (jobId) => (0, video_1.updateJobStatus)(jobId, 'processing');
exports.markJobProcessing = markJobProcessing;
const markJobFailed = (jobId) => (0, video_1.updateJobStatus)(jobId, 'failed');
exports.markJobFailed = markJobFailed;
const markJobCompleted = async (jobId, pdfPath, frameCount) => {
    await (0, video_1.updateJobStatus)(jobId, 'completed');
    await (0, video_1.createOutput)(jobId, pdfPath, frameCount);
};
exports.markJobCompleted = markJobCompleted;
