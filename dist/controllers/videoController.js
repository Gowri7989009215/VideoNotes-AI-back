"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJob = exports.listJobs = exports.createYoutubeJob = exports.uploadVideo = void 0;
const videoService_1 = require("../services/videoService");
const uploadVideo = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Unauthorized' });
    const file = req.file;
    const { mode, intervalSeconds } = req.body;
    if (!file) {
        return res.status(400).json({ message: 'File is required' });
    }
    const interval = Number(intervalSeconds ?? 3);
    if (!['frames', 'frames+transcript'].includes(mode)) {
        return res.status(400).json({ message: 'Invalid mode' });
    }
    try {
        const job = await (0, videoService_1.createVideoJobFromUpload)(req.user.id, file.path, mode, interval);
        return res.status(201).json({ jobId: job.id });
    }
    catch (err) {
        return res.status(500).json({ message: err instanceof Error ? err.message : 'Failed to create job' });
    }
};
exports.uploadVideo = uploadVideo;
const createYoutubeJob = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Unauthorized' });
    const { youtubeUrl, mode, intervalSeconds } = req.body;
    const interval = Number(intervalSeconds ?? 3);
    if (!youtubeUrl)
        return res.status(400).json({ message: 'YouTube URL is required' });
    if (!['frames', 'frames+transcript'].includes(mode)) {
        return res.status(400).json({ message: 'Invalid mode' });
    }
    try {
        const job = await (0, videoService_1.createVideoJobFromYoutube)(req.user.id, youtubeUrl, mode, interval);
        return res.status(201).json({ jobId: job.id });
    }
    catch (err) {
        return res.status(500).json({ message: err instanceof Error ? err.message : 'Failed to create job' });
    }
};
exports.createYoutubeJob = createYoutubeJob;
const listJobs = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Unauthorized' });
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const jobs = await (0, videoService_1.listJobsForUser)(req.user.id, limit);
    return res.json({ jobs });
};
exports.listJobs = listJobs;
const getJob = async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Unauthorized' });
    const jobId = req.params.jobId;
    const job = await (0, videoService_1.getJobForUser)(req.user.id, jobId);
    if (!job)
        return res.status(404).json({ message: 'Job not found' });
    return res.json(job);
};
exports.getJob = getJob;
