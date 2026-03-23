"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordController = exports.forgotPassword = exports.resendVerificationController = exports.verifyEmailController = exports.login = exports.register = void 0;
const authService_1 = require("../services/authService");
const register = async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    try {
        await (0, authService_1.registerUser)(name, email, password);
        return res.status(201).json({ message: 'Registered. Please verify your email.' });
    }
    catch (err) {
        return res.status(400).json({ message: err instanceof Error ? err.message : 'Registration failed' });
    }
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    try {
        const { user, token } = await (0, authService_1.loginUser)(email, password);
        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                isVerified: user.is_verified
            }
        });
    }
    catch (err) {
        return res.status(400).json({ message: err instanceof Error ? err.message : 'Login failed' });
    }
};
exports.login = login;
const verifyEmailController = async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ message: 'Email and code are required' });
    }
    try {
        await (0, authService_1.verifyEmail)(email, code);
        return res.json({ message: 'Email verified' });
    }
    catch (err) {
        return res.status(400).json({ message: err instanceof Error ? err.message : 'Verification failed' });
    }
};
exports.verifyEmailController = verifyEmailController;
const resendVerificationController = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    try {
        await (0, authService_1.resendVerification)(email);
        return res.json({ message: 'If the email exists, a new code was sent.' });
    }
    catch (err) {
        return res.status(400).json({ message: err instanceof Error ? err.message : 'Failed to resend verification' });
    }
};
exports.resendVerificationController = resendVerificationController;
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    try {
        await (0, authService_1.requestPasswordReset)(email);
        return res.json({ message: 'If the email exists, a reset code was sent.' });
    }
    catch (err) {
        return res.status(400).json({ message: err instanceof Error ? err.message : 'Failed to request reset' });
    }
};
exports.forgotPassword = forgotPassword;
const resetPasswordController = async (req, res) => {
    const { email, code, password } = req.body;
    if (!email || !code || !password) {
        return res.status(400).json({ message: 'Email, code, and password are required' });
    }
    try {
        await (0, authService_1.resetPassword)(email, code, password);
        return res.json({ message: 'Password updated' });
    }
    catch (err) {
        return res.status(400).json({ message: err instanceof Error ? err.message : 'Failed to reset password' });
    }
};
exports.resetPasswordController = resetPasswordController;
