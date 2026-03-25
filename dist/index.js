"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("./config/env");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const videoRoutes_1 = __importDefault(require("./routes/videoRoutes"));
const jobRoutes_1 = __importDefault(require("./routes/jobRoutes"));
const queue_1 = require("./config/queue");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173'],
    credentials: false
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);
const storageRoot = env_1.env.storageRoot;
if (!fs_1.default.existsSync(storageRoot)) {
    fs_1.default.mkdirSync(storageRoot, { recursive: true });
}
app.use('/api/files', (req, res) => {
    const encoded = req.path.slice(1);
    const filePath = decodeURIComponent(encoded);
    const absolute = path_1.default.isAbsolute(filePath) ? filePath : path_1.default.join(process.cwd(), filePath);
    if (!fs_1.default.existsSync(absolute)) {
        return res.status(404).send('File not found');
    }
    return res.sendFile(absolute);
});
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/videos', videoRoutes_1.default);
app.use('/api/jobs', jobRoutes_1.default);
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});
const PORT = process.env.PORT || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
try {
    (0, queue_1.startVideoWorker)();
}
catch (err) {
    // eslint-disable-next-line no-console
    console.error('Worker failed to start (Redis/queue). API will still run.', err);
}
