"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchYoutubeTranscript = exports.extractVideoId = void 0;

const { getTranscript } = require("youtube-transcript-api");

const extractVideoId = (url) => {
    try {
        const u = new URL(url);

        if (u.hostname === 'youtu.be') {
            return u.pathname.slice(1) || null;
        }

        if (u.searchParams.has('v')) {
            return u.searchParams.get('v');
        }

        const parts = u.pathname.split('/');
        const idx = parts.indexOf('embed');

        if (idx !== -1 && parts[idx + 1]) {
            return parts[idx + 1];
        }

        return null;
    } catch {
        return null;
    }
};
exports.extractVideoId = extractVideoId;

const fetchYoutubeTranscript = async (videoId) => {
    const raw = await getTranscript(videoId);

    return raw.map((item) => ({
        start: item.start,
        end: item.start + item.duration,
        text: item.text
    }));
};
exports.fetchYoutubeTranscript = fetchYoutubeTranscript;
