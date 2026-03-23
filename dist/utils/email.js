"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendJobCompletionEmail = exports.sendPasswordResetEmail = exports.sendVerificationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const resend_1 = require("resend");
const env_1 = require("../config/env");
const useResend = !!env_1.env.resendApiKey;
const resendClient = useResend ? new resend_1.Resend(env_1.env.resendApiKey) : null;
const transporter = !useResend
    ? nodemailer_1.default.createTransport({
        service: 'gmail',
        auth: {
            user: env_1.env.gmailUser,
            pass: env_1.env.gmailPass
        }
    })
    : null;
const sendMail = async (to, subject, html) => {
    const from = env_1.env.emailFrom;
    if (!from) {
        throw new Error('EMAIL_FROM is not configured');
    }
    if (useResend && resendClient) {
        await resendClient.emails.send({
            from,
            to,
            subject,
            html
        });
    }
    else if (transporter) {
        await transporter.sendMail({ to, from, subject, html });
    }
    else {
        throw new Error('No email provider configured');
    }
};
const sendVerificationEmail = async (to, code) => {
    const subject = 'Verify your VideoNotes AI account';
    const html = `
    <p>Welcome to <strong>VideoNotes AI</strong>!</p>
    <p>Your email verification code is:</p>
    <p style="font-size: 20px; font-weight: bold;">${code}</p>
    <p>This code expires in 15 minutes.</p>
  `;
    await sendMail(to, subject, html);
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendPasswordResetEmail = async (to, code) => {
    const subject = 'Reset your VideoNotes AI password';
    const html = `
    <p>You requested to reset your <strong>VideoNotes AI</strong> password.</p>
    <p>Your reset code is:</p>
    <p style="font-size: 20px; font-weight: bold;">${code}</p>
    <p>This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
  `;
    await sendMail(to, subject, html);
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendJobCompletionEmail = async (to, jobId) => {
    const subject = 'Your VideoNotes AI job is ready';
    const html = `
    <p>Your VideoNotes AI job <strong>${jobId}</strong> has completed.</p>
    <p>You can log in to your dashboard to download the generated PDF.</p>
  `;
    await sendMail(to, subject, html);
};
exports.sendJobCompletionEmail = sendJobCompletionEmail;
