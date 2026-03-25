const { getTranscript } = require('youtube-transcript-api')

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export const extractVideoId = (url: string): string | null => {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1) || null
    }
    if (u.searchParams.has('v')) {
      return u.searchParams.get('v')
    }
    const parts = u.pathname.split('/')
    const idx = parts.indexOf('embed')
    if (idx !== -1 && parts[idx + 1]) {
      return parts[idx + 1]
    }
    return null
  } catch {
    return null
  }
}

export const fetchYoutubeTranscript = async (videoId: string): Promise<TranscriptSegment[]> => {
  const raw = await getTranscript(videoId)
  return raw.map((item) => ({
    start: item.start,
    end: item.start + item.duration,
    text: item.text
  }))
}

