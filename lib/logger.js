// Lightweight logger. Debug logs are suppressed in production; errors/warnings always emit.
// Never log request bodies, passwords, or tokens.
const isProd = process.env.NODE_ENV === 'production'

export const logger = {
  debug: (...args) => { if (!isProd) console.log(...args) },
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
}

export default logger
