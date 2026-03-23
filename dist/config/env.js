"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    port: Number(process.env.PORT ?? 4000),
    databaseUrl: process.env.DATABASE_URL ?? '',
    jwtSecret: process.env.JWT_SECRET ?? 'changeme',
    gmailUser: process.env.GMAIL_USER ?? '',
    gmailPass: process.env.GMAIL_PASS ?? '',
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    emailFrom: process.env.EMAIL_FROM ?? process.env.GMAIL_USER ?? '',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    openAiApiKey: process.env.OPENAI_API_KEY ?? '',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    storageRoot: process.env.STORAGE_ROOT ?? 'storage'
};
if (!exports.env.databaseUrl) {
    // eslint-disable-next-line no-console
    console.warn('DATABASE_URL is not set - database connections will fail until configured.');
}
