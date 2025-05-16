/**
 * Logger utility for Group Iron site
 * Provides consistent logging with level control and formatting
 */

// Log levels
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Current log level (can be changed at runtime)
let currentLogLevel = LOG_LEVELS.INFO;

/**
 * Set the current logging level
 * @param {number} level - Log level from LOG_LEVELS enum
 */
export function setLogLevel(level) {
  if (Object.values(LOG_LEVELS).includes(level)) {
    currentLogLevel = level;
    console.log(`[Logger] Log level set to: ${getLogLevelName(level)}`);
  }
}

/**
 * Get log level name
 * @param {number} level - Log level
 * @return {string} - Name of the log level
 */
function getLogLevelName(level) {
  return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'UNKNOWN';
}

/**
 * Format a log message with timestamp and level
 * @param {string} level - Log level string
 * @param {string} message - Message to log
 * @return {string} - Formatted message
 */
function formatLogMessage(level, message) {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Log a debug message
 * @param {string} message - Message to log
 * @param {any} [data] - Optional data to include
 */
export function logDebug(message, data) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    console.debug(formatLogMessage('DEBUG', message), data !== undefined ? data : '');
  }
}

/**
 * Log an info message
 * @param {string} message - Message to log
 * @param {any} [data] - Optional data to include
 */
export function logInfo(message, data) {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    console.info(formatLogMessage('INFO', message), data !== undefined ? data : '');
  }
}

/**
 * Log a warning message
 * @param {string} message - Message to log
 * @param {any} [data] - Optional data to include
 */
export function logWarn(message, data) {
  if (currentLogLevel <= LOG_LEVELS.WARN) {
    console.warn(formatLogMessage('WARN', message), data !== undefined ? data : '');
  }
}

/**
 * Log an error message
 * @param {string} message - Message to log
 * @param {Error} [error] - Optional error object
 */
export function logError(message, error) {
  if (currentLogLevel <= LOG_LEVELS.ERROR) {
    console.error(formatLogMessage('ERROR', message), error || '');
    if (error && error.stack) {
      console.error(error.stack);
    }
  }
}

// Export a default logger object
export default {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  setLevel: setLogLevel,
  levels: LOG_LEVELS
};

// Make logger globally available
window.logger = {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  setLevel: setLogLevel,
  levels: LOG_LEVELS
};
