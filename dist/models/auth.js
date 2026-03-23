"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumePasswordReset = exports.createPasswordReset = exports.consumeEmailVerification = exports.createEmailVerification = void 0;
const db_1 = require("../config/db");
const createEmailVerification = async (userId, code, expiresAt) => {
    await (0, db_1.query)('INSERT INTO email_verifications (user_id, verification_code, expires_at) VALUES ($1, $2, $3)', [
        userId,
        code,
        expiresAt
    ]);
};
exports.createEmailVerification = createEmailVerification;
const consumeEmailVerification = async (userId, code) => {
    const result = await (0, db_1.query)('DELETE FROM email_verifications WHERE user_id = $1 AND verification_code = $2 AND expires_at > NOW() RETURNING *', [userId, code]);
    return result.rowCount > 0;
};
exports.consumeEmailVerification = consumeEmailVerification;
const createPasswordReset = async (userId, code, expiresAt) => {
    await (0, db_1.query)('INSERT INTO password_resets (user_id, reset_code, expires_at) VALUES ($1, $2, $3)', [
        userId,
        code,
        expiresAt
    ]);
};
exports.createPasswordReset = createPasswordReset;
const consumePasswordReset = async (userId, code) => {
    const result = await (0, db_1.query)('DELETE FROM password_resets WHERE user_id = $1 AND reset_code = $2 AND expires_at > NOW() RETURNING *', [userId, code]);
    return result.rowCount > 0;
};
exports.consumePasswordReset = consumePasswordReset;
