/**
 * Simple logger utility for consistent logging across the application.
 * In production, you'd use winston or pino for more sophisticated logging.
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLogLevel = process.env.LOG_LEVEL || 'INFO';

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
  return `[${timestamp}] [${level}] ${message} ${metaStr}`;
}

function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel.toUpperCase()];
}

export const logger = {
  debug: (message, meta) => {
    if (shouldLog('DEBUG')) {
      console.log(formatMessage('DEBUG', message, meta));
    }
  },

  info: (message, meta) => {
    if (shouldLog('INFO')) {
      console.log(formatMessage('INFO', message, meta));
    }
  },

  warn: (message, meta) => {
    if (shouldLog('WARN')) {
      console.warn(formatMessage('WARN', message, meta));
    }
  },

  error: (message, meta) => {
    if (shouldLog('ERROR')) {
      console.error(formatMessage('ERROR', message, meta));
    }
  }
};
