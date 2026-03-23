"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startVideoWorker = exports.videoQueue = exports.videoQueueName = void 0;
const bullmq_1 = require("bullmq");
const env_1 = require("./env");
const videoProcessor_1 = require("../workers/videoProcessor");
const connection = {
    connection: {
        url: env_1.env.redisUrl
    }
};
exports.videoQueueName = 'video-processing';
exports.videoQueue = new bullmq_1.Queue(exports.videoQueueName, connection);
const startVideoWorker = () => {
    // eslint-disable-next-line no-new
    new bullmq_1.Worker(exports.videoQueueName, videoProcessor_1.videoProcessingJobHandler, connection);
};
exports.startVideoWorker = startVideoWorker;
