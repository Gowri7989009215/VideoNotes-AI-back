"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = void 0;
const user_1 = require("../models/user");
const getMe = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await (0, user_1.findUserById)(req.user.id);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }
    return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        isVerified: user.is_verified
    });
};
exports.getMe = getMe;
