"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const videoController_1 = require("../controllers/videoController");
const auth_1 = require("../middlewares/auth");
const env_1 = require("../config/env");
const storageRoot = env_1.env.storageRoot;
const uploadDir = path_1.default.join(storageRoot, 'uploads');
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const unique = Date.now().toString(36);
        cb(null, `${unique}-${file.originalname}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 1024 * 1024 * 1024 // 1GB; adjust for production
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('video/'))
            cb(null, true);
        else
            cb(new Error('Only video files are allowed'));
    }
});
const router = (0, express_1.Router)();
router.post('/upload', auth_1.authMiddleware, upload.single('file'), videoController_1.uploadVideo);
router.post('/youtube', auth_1.authMiddleware, videoController_1.createYoutubeJob);
router.get('/jobs', auth_1.authMiddleware, videoController_1.listJobs);
router.get('/jobs/:jobId', auth_1.authMiddleware, videoController_1.getJob);
exports.default = router;
