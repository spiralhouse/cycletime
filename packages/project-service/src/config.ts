import { loadConfig } from '@cycletime/shared-config';

export const config = loadConfig({
  serviceName: 'project-service',
  port: 8006,
  host: '0.0.0.0',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10)
  },
  queue: {
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  },
  ai: {
    enabled: process.env.AI_ENABLED === 'true',
    provider: process.env.AI_PROVIDER || 'openai',
    apiKey: process.env.AI_API_KEY
  },
  analytics: {
    enabled: process.env.ANALYTICS_ENABLED === 'true',
    batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE || '100', 10),
    flushInterval: parseInt(process.env.ANALYTICS_FLUSH_INTERVAL || '30000', 10)
  },
  integrations: {
    github: {
      enabled: process.env.GITHUB_ENABLED === 'true',
      apiUrl: process.env.GITHUB_API_URL || 'https://api.github.com'
    },
    linear: {
      enabled: process.env.LINEAR_ENABLED === 'true',
      apiUrl: process.env.LINEAR_API_URL || 'https://api.linear.app'
    },
    slack: {
      enabled: process.env.SLACK_ENABLED === 'true',
      botToken: process.env.SLACK_BOT_TOKEN,
      signingSecret: process.env.SLACK_SIGNING_SECRET
    }
  }
});