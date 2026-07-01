const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50
};

function currentLevel() {
  const envLevel = String(process.env.LOG_LEVEL || '').toLowerCase();
  if (LEVELS[envLevel] !== undefined) return LEVELS[envLevel];
  return process.env.NODE_ENV === 'test' ? LEVELS.silent : LEVELS.info;
}

function shouldLog(level) {
  return LEVELS[level] >= currentLevel();
}

function redactUrl(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}${url.search ? '?[redacted]' : ''}`;
  } catch {
    return value;
  }
}

function sanitize(value) {
  if (typeof value === 'string') {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return redactUrl(value);
    }
    return value.length > 160 ? `${value.slice(0, 80)}...[${value.length} chars]` : value;
  }
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitize);

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, sanitize(item)])
  );
}

function write(level, args) {
  if (!shouldLog(level)) return;
  const method = level === 'debug' ? 'log' : level;
  console[method](...args.map(sanitize));
}

module.exports = {
  debug: (...args) => write('debug', args),
  info: (...args) => write('info', args),
  warn: (...args) => write('warn', args),
  error: (...args) => write('error', args)
};
