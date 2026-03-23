"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const videoController_1 = require("../controllers/videoController");
// Convenience routes to match frontend: /api/jobs/*
const router = (0, express_1.Router)();
router.get('/', auth_1.authMiddleware, videoController_1.listJobs);
router.get('/:jobId', auth_1.authMiddleware, videoController_1.getJob);
exports.default = router;
