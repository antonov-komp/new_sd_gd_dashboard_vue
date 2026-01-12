// Мок для Logger
export const Logger = {
  info: (...args) => console.log('[INFO]', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args),
  warn: (...args) => console.log('[WARN]', ...args),
  error: (...args) => console.log('[ERROR]', ...args)
};