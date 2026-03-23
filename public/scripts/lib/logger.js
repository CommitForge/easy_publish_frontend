const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export function createLogger(level = 'info') {
  const current = LEVELS[level] ?? LEVELS.info;

  function write(kind, message, meta) {
    if ((LEVELS[kind] ?? LEVELS.info) > current) return;
    const ts = new Date().toISOString();
    const suffix = meta ? ` ${JSON.stringify(meta)}` : '';
    process.stderr.write(`[${ts}] ${kind.toUpperCase()} ${message}${suffix}\n`);
  }

  return {
    level,
    error: (message, meta) => write('error', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    info: (message, meta) => write('info', message, meta),
    debug: (message, meta) => write('debug', message, meta),
  };
}
