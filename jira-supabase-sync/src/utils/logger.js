/**
 * Logger simple para el servicio
 */

import { config } from '../config.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function formatTimestamp() {
  return new Date().toISOString();
}

function log(level, message, data = null) {
  const timestamp = formatTimestamp();
  const levelUpper = level.toUpperCase().padEnd(5);
  
  let color = colors.reset;
  switch (level) {
    case 'error':
      color = colors.red;
      break;
    case 'warn':
      color = colors.yellow;
      break;
    case 'info':
      color = colors.cyan;
      break;
    case 'debug':
      color = colors.magenta;
      break;
    case 'success':
      color = colors.green;
      break;
  }
  
  const logMessage = `${color}[${timestamp}] [${levelUpper}]${colors.reset} ${message}`;
  console.log(logMessage);
  
  if (data && (config.logging.debug || level === 'error')) {
    console.log(JSON.stringify(data, null, 2));
  }
}

export const logger = {
  error: (message, data) => log('error', message, data),
  warn: (message, data) => log('warn', message, data),
  info: (message, data) => log('info', message, data),
  debug: (message, data) => log('debug', message, data),
  success: (message, data) => log('success', message, data),
};

export default logger;

