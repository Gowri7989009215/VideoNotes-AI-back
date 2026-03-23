import youtubedl from 'youtube-dl-exec'
import fs from 'fs'

export interface VideoInfo {
  title: string
  duration: number
  thumbnail: string
}

export const downloadYouTubeVideo = async (videoUrl: string, outputPath: string): Promise<void> => {
  // eslint-disable-next-line no-console
  console.log(`[Download] Starting download from ${videoUrl}`)
  
  try {
    await youtubedl(videoUrl, {
      output: outputPath,
      format: 'worstvideo[ext=mp4]+worstaudio[ext=m4a]/worst[ext=mp4]/worst', // Get any working format
      noPlaylist: true,
      callHome: false,
      noCheckCertificate: true,
      preferFreeFormats: false,
      addHeader: [
        'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer:https://www.youtube.com/'
      ]
    })
    
    // Verify file was created and has reasonable size
    if (!fs.existsSync(outputPath)) {
      throw new Error('Download failed - file not created')
    }
    
    const stats = fs.statSync(outputPath)
    // eslint-disable-next-line no-console
    console.log(`[Download] Download complete: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`)
    
    // Check if file is too small (less than 500KB is suspicious for video)
    if (stats.size < 500 * 1024) {
      throw new Error(`Downloaded file too small (${(stats.size / 1024).toFixed(2)} KB) - likely a failed download or corrupted video`)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Download] Error:', err instanceof Error ? err.message : 'Unknown error')
    throw err
  }
}

export const getVideoInfo = async (videoUrl: string): Promise<VideoInfo> => {
  // eslint-disable-next-line no-console
  console.log(`[Download] Getting video info for ${videoUrl}`)
  
  try {
    const info = await youtubedl(videoUrl, {
      callHome: false,
      noCheckCertificate: true,
      dumpSingleJson: true,
    })
    
    return {
      title: (info as any).title || 'Unknown',
      duration: (info as any).duration || 0,
      thumbnail: (info as any).thumbnail || ''
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Download] Error getting info:', err instanceof Error ? err.message : 'Unknown error')
    throw err
  }
}
