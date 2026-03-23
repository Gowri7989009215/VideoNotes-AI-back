"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markUserVerified = exports.createUser = exports.findUserById = exports.findUserByEmail = void 0;
const db_1 = require("../config/db");
const findUserByEmail = async (email) => {
    const result = await (0, db_1.query)('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    return result.rows[0] ?? null;
};
exports.findUserByEmail = findUserByEmail;
const findUserById = async (id) => {
    const result = await (0, db_1.query)('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ?? null;
};
exports.findUserById = findUserById;
const createUser = async (name, email, passwordHash) => {
    const result = await (0, db_1.query)('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *', [name, email.toLowerCase(), passwordHash]);
    return result.rows[0];
};
exports.createUser = createUser;
const markUserVerified = async (userId) => {
    await (0, db_1.query)('UPDATE users SET is_verified = true WHERE id = $1', [userId]);
};
exports.markUserVerified = markUserVerified;
