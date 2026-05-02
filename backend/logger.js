'use strict';

const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const configuredLevel = String(process.env.LOG_LEVEL || 'info').toLowerCase();
const activeLevel = Object.prototype.hasOwnProperty.call(LEVELS, configuredLevel)
  ? configuredLevel
  : 'info';

function shouldLog(level) {
  return LEVELS[level] <= LEVELS[activeLevel];
}

function normalizeScope(scope) {
  if (!scope) return '';
  const parts = Array.isArray(scope) ? scope : [scope];
  return parts.filter(Boolean).map((part) => `[${String(part)}]`).join('');
}

function formatMeta(meta = {}) {
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (entries.length === 0) return '';
  return ` ${entries.map(([key, value]) => `${key}=${value}`).join(' ')}`;
}

function write(level, scope, message, meta) {
  if (!shouldLog(level)) return;
  const line = `${new Date().toISOString()} [${level}]${normalizeScope(scope)} ${message}${formatMeta(meta)}`;
  const method = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  method(line);
}

function createLogger(scope) {
  return {
    error(message, meta) { write('error', scope, message, meta); },
    warn(message, meta) { write('warn', scope, message, meta); },
    info(message, meta) { write('info', scope, message, meta); },
    debug(message, meta) { write('debug', scope, message, meta); },
    child(childScope) {
      const childParts = [...(Array.isArray(scope) ? scope : [scope]), childScope];
      return createLogger(childParts);
    },
  };
}

module.exports = { createLogger };
