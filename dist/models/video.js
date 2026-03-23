"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findJobByIdForUser = exports.findJobsForUser = exports.createOutput = exports.updateJobStatus = exports.createJob = exports.createVideo = void 0;
const db_1 = require("../config/db");
const createVideo = async (userId, inputType, sourceUrl, filePath) => {
    const result = await (0, db_1.query)('INSERT INTO videos (user_id, input_type, source_url, file_path) VALUES ($1, $2, $3, $4) RETURNING *', [userId, inputType, sourceUrl, filePath]);
    return result.rows[0];
};
exports.createVideo = createVideo;
const createJob = async (userId, videoId, mode, intervalSeconds) => {
    const result = await (0, db_1.query)('INSERT INTO jobs (user_id, video_id, mode, interval_seconds, status) VALUES ($1, $2, $3, $4, $5) RETURNING *', [userId, videoId, mode, intervalSeconds, 'pending']);
    return result.rows[0];
};
exports.createJob = createJob;
const updateJobStatus = async (jobId, status) => {
    await (0, db_1.query)('UPDATE jobs SET status = $1 WHERE id = $2', [status, jobId]);
};
exports.updateJobStatus = updateJobStatus;
const createOutput = async (jobId, pdfPath, frameCount) => {
    const result = await (0, db_1.query)('INSERT INTO outputs (job_id, pdf_path, frame_count) VALUES ($1, $2, $3) RETURNING *', [jobId, pdfPath, frameCount]);
    return result.rows[0];
};
exports.createOutput = createOutput;
const findJobsForUser = async (userId, limit) => {
    const result = await (0, db_1.query)(`
      SELECT j.*, o.id as "output_id", o.pdf_path, o.frame_count, o.created_at as "output_created_at"
      FROM jobs j
      LEFT JOIN outputs o ON o.job_id = j.id
      WHERE j.user_id = $1
      ORDER BY j.created_at DESC
      ${limit ? 'LIMIT ' + Number(limit) : ''}
    `, [userId]);
    return result.rows.map((row) => {
        const output = row.output_id
            ? {
                id: row.output_id,
                job_id: row.id,
                pdf_path: row.pdf_path ?? '',
                frame_count: row.frame_count ?? 0,
                created_at: row.output_created_at ?? new Date()
            }
            : null;
        const { output_id, pdf_path, frame_count, output_created_at, ...job } = row;
        return { ...job, output };
    });
};
exports.findJobsForUser = findJobsForUser;
const findJobByIdForUser = async (userId, jobId) => {
    const result = await (0, db_1.query)(`
      SELECT j.*, o.id as "output_id", o.pdf_path, o.frame_count, o.created_at as "output_created_at"
      FROM jobs j
      LEFT JOIN outputs o ON o.job_id = j.id
      WHERE j.user_id = $1 AND j.id = $2
    `, [userId, jobId]);
    const row = result.rows[0];
    if (!row)
        return null;
    const output = row.output_id
        ? {
            id: row.output_id,
            job_id: row.id,
            pdf_path: row.pdf_path ?? '',
            frame_count: row.frame_count ?? 0,
            created_at: row.output_created_at ?? new Date()
        }
        : null;
    const { output_id, pdf_path, frame_count, output_created_at, ...job } = row;
    return { ...job, output };
};
exports.findJobByIdForUser = findJobByIdForUser;
