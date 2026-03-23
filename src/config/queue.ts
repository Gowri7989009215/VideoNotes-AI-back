import { Queue, Worker } from 'bullmq'
import { env } from './env'
import { videoProcessingJobHandler } from '../workers/videoProcessor'

const connection = {
  connection: {
    url: env.redisUrl
  }
}

export const videoQueueName = 'video-processing'

export const videoQueue = new Queue(videoQueueName, connection)

export const startVideoWorker = () => {
  // eslint-disable-next-line no-new
  new Worker(videoQueueName, videoProcessingJobHandler, connection)
}

