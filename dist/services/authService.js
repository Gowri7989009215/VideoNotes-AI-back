"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.requestPasswordReset = exports.resendVerification = exports.verifyEmail = exports.loginUser = exports.registerUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const user_1 = require("../models/user");
const auth_1 = require("../models/auth");
const email_1 = require("../utils/email");
const EMAIL_CODE_TTL_MINUTES = 15;
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();
const registerUser = async (name, email, password) => {
    const existing = await (0, user_1.findUserByEmail)(email);
    if (existing) {
        throw new Error('Email already registered');
    }
    const passwordHash = await bcrypt_1.default.hash(password, 10);
    const user = await (0, user_1.createUser)(name, email, passwordHash);
    const code = generateCode();
    const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000);
    await (0, auth_1.createEmailVerification)(user.id, code, expiresAt);
    await (0, email_1.sendVerificationEmail)(user.email, code);
    return user;
};
exports.registerUser = registerUser;
const loginUser = async (email, password) => {
    const user = await (0, user_1.findUserByEmail)(email);
    if (!user) {
        throw new Error('Invalid email or password');
    }
    const valid = await bcrypt_1.default.compare(password, user.password_hash);
    if (!valid) {
        throw new Error('Invalid email or password');
    }
    if (!user.is_verified) {
        throw new Error('Please verify your email before logging in');
    }
    const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, env_1.env.jwtSecret, { expiresIn: '7d' });
    return { user, token };
};
exports.loginUser = loginUser;
const verifyEmail = async (email, code) => {
    const user = await (0, user_1.findUserByEmail)(email);
    if (!user)
        throw new Error('User not found');
    const ok = await (0, auth_1.consumeEmailVerification)(user.id, code);
    if (!ok)
        throw new Error('Invalid or expired verification code');
    await (0, user_1.markUserVerified)(user.id);
};
exports.verifyEmail = verifyEmail;
const resendVerification = async (email) => {
    const user = await (0, user_1.findUserByEmail)(email);
    if (!user) {
        return;
    }
    const code = generateCode();
    const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000);
    await (0, auth_1.createEmailVerification)(user.id, code, expiresAt);
    await (0, email_1.sendVerificationEmail)(user.email, code);
};
exports.resendVerification = resendVerification;
const requestPasswordReset = async (email) => {
    const user = await (0, user_1.findUserByEmail)(email);
    if (!user) {
        return;
    }
    const code = generateCode();
    const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000);
    await (0, auth_1.createPasswordReset)(user.id, code, expiresAt);
    await (0, email_1.sendPasswordResetEmail)(user.email, code);
};
exports.requestPasswordReset = requestPasswordReset;
const resetPassword = async (email, code, newPassword) => {
    const user = await (0, user_1.findUserByEmail)(email);
    if (!user)
        throw new Error('User not found');
    const ok = await (0, auth_1.consumePasswordReset)(user.id, code);
    if (!ok)
        throw new Error('Invalid or expired reset code');
    const hash = await bcrypt_1.default.hash(newPassword, 10);
    await Promise.resolve().then(() => __importStar(require('../config/db'))).then(({ query }) => query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]));
};
exports.resetPassword = resetPassword;
